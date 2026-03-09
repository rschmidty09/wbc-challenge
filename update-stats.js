// WBC 2026 Stats Updater
// Fetches batting stats from MLB Stats API for all WBC games
// Run nightly at 10pm CST via Task Scheduler

const fs = require('fs');
const path = require('path');

const PICKS_FILE = path.join(__dirname, 'picks.json');
const STATS_FILE = path.join(__dirname, 'stats.json');

// WBC 2026 date range
const SEASON = 2026;
const START_DATE = '2026-03-01';
const END_DATE = '2026-04-30';

// MLB Stats API - WBC uses sportId=51 (International Baseball)
// gameType=F (pool play), D (quarterfinals), L (semifinals), W (championship), E (exhibition)
const SCHEDULE_URL = `https://statsapi.mlb.com/api/v1/schedule?sportId=51&season=${SEASON}&startDate=${START_DATE}&endDate=${END_DATE}`;

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

// Build a normalized name map from picks for fuzzy matching
function buildPlayerSet(picks) {
  const players = new Set();
  for (const country of picks.countries) {
    for (const name of Object.values(country.picks)) {
      players.add(name);
    }
  }
  return players;
}

// Normalize a name for comparison: lowercase, remove punctuation
function normalize(name) {
  return name.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
}

// Build alias map to handle slight name differences
function buildAliasMap(playerSet) {
  const map = {};
  for (const name of playerSet) {
    map[normalize(name)] = name;
  }
  // Extra aliases for tricky names
  const extras = {
    'jazz chisholm': 'Jazz Chisholm Jr.',
    'jazz chisholm jr': 'Jazz Chisholm Jr.',
    'ronald acuna': 'Ronald Acuna Jr.',
    'ronald acuna jr': 'Ronald Acuna Jr.',
    'vladimir guerrero': 'Vladimir Guerrero Jr.',
    'dante bichette': 'Dante Bichette Jr',
    'travis bazzana': 'Travis Bazzana',
    'bryce harper': 'Bryce Harper',
    'murakami': 'Munetaka Murakami',
    'munetaka murakami': 'Munetaka Murakami',
    'junior caminero': 'Junior Caminero',
    'caminero': 'Junior Caminero',
    'gio urshela': 'Gio Urshela',
    'giovanny urshela': 'Gio Urshela',
    'nolan arenado': 'Nolan Arenado',
    'nolan aranado': 'Nolan Arenado',
    'hyunmin ahn': 'Hyun-min Ahn',
    'ivan herrera': 'Ivan Herrera',
    'jarren duran': 'Jarren Duran',
  };
  for (const [alias, canonical] of Object.entries(extras)) {
    if (!map[alias]) map[alias] = canonical;
  }
  return map;
}

function matchPlayer(apiName, aliasMap) {
  const norm = normalize(apiName);
  if (aliasMap[norm]) return aliasMap[norm];
  // Try last name match as fallback
  const lastName = norm.split(' ').pop();
  for (const [key, val] of Object.entries(aliasMap)) {
    if (key.endsWith(lastName) || key.startsWith(lastName)) {
      // Only use last-name match if it's unique enough (skip common names)
      const commonLastNames = ['rodriguez', 'martinez', 'gonzalez', 'hernandez', 'ramirez', 'jones', 'johnson', 'smith'];
      if (!commonLastNames.includes(lastName)) return val;
    }
  }
  return null;
}

async function getCompletedGames() {
  console.log('Fetching WBC schedule...');
  const data = await fetchJson(SCHEDULE_URL);
  const games = [];
  for (const date of (data.dates || [])) {
    for (const game of (date.games || [])) {
      if (game.status?.abstractGameState === 'Final') {
        games.push(game.gamePk);
      }
    }
  }
  console.log(`Found ${games.length} completed games`);
  return games;
}

async function getBoxScore(gamePk) {
  const url = `https://statsapi.mlb.com/api/v1/game/${gamePk}/boxscore`;
  return fetchJson(url);
}

function extractBattingStats(boxscore, aliasMap, accumulated) {
  for (const side of ['home', 'away']) {
    const teamData = boxscore.teams?.[side];
    if (!teamData?.players) continue;
    for (const [, player] of Object.entries(teamData.players)) {
      const fullName = player.person?.fullName;
      if (!fullName) continue;
      const canonical = matchPlayer(fullName, aliasMap);
      if (!canonical) continue;

      const bat = player.stats?.batting;
      if (!bat || bat.atBats == null) continue;

      if (!accumulated[canonical]) {
        accumulated[canonical] = { walks: 0, singles: 0, doubles: 0, triples: 0, homeRuns: 0, rbi: 0, runs: 0, points: 0 };
      }
      const s = accumulated[canonical];
      const walks = bat.baseOnBalls || 0;
      const doubles = bat.doubles || 0;
      const triples = bat.triples || 0;
      const hrs = bat.homeRuns || 0;
      const hits = bat.hits || 0;
      const singles = Math.max(0, hits - doubles - triples - hrs);
      const rbi = bat.rbi || 0;
      const runs = bat.runs || 0;

      s.walks += walks;
      s.singles += singles;
      s.doubles += doubles;
      s.triples += triples;
      s.homeRuns += hrs;
      s.rbi += rbi;
      s.runs += runs;
    }
  }
}

function calcPoints(stats, scoring) {
  return (
    stats.walks * scoring.walks +
    stats.singles * scoring.singles +
    stats.doubles * scoring.doubles +
    stats.triples * scoring.triples +
    stats.homeRuns * scoring.homeRuns +
    stats.rbi * scoring.rbi +
    stats.runs * scoring.runs
  );
}

async function main() {
  console.log(`\n=== WBC Stats Update ${new Date().toLocaleString()} ===`);

  const picks = JSON.parse(fs.readFileSync(PICKS_FILE, 'utf8'));
  const playerSet = buildPlayerSet(picks);
  const aliasMap = buildAliasMap(playerSet);

  let gamePks;
  try {
    gamePks = await getCompletedGames();
  } catch (err) {
    console.error('Failed to fetch schedule:', err.message);
    process.exit(1);
  }

  if (gamePks.length === 0) {
    console.log('No completed games found yet. Stats remain at zero.');
    const current = JSON.parse(fs.readFileSync(STATS_FILE, 'utf8'));
    current.lastUpdated = new Date().toISOString();
    fs.writeFileSync(STATS_FILE, JSON.stringify(current, null, 2));
    return;
  }

  const accumulated = {};

  for (const gamePk of gamePks) {
    try {
      console.log(`  Fetching box score for game ${gamePk}...`);
      const boxscore = await getBoxScore(gamePk);
      extractBattingStats(boxscore, aliasMap, accumulated);
    } catch (err) {
      console.warn(`  Skipping game ${gamePk}: ${err.message}`);
    }
  }

  // Calculate points for each player
  for (const [name, stats] of Object.entries(accumulated)) {
    stats.points = calcPoints(stats, picks.scoring);
  }

  // Ensure every picked player appears (even with zeros)
  for (const name of playerSet) {
    if (!accumulated[name]) {
      accumulated[name] = { walks: 0, singles: 0, doubles: 0, triples: 0, homeRuns: 0, rbi: 0, runs: 0, points: 0 };
    }
  }

  const output = {
    lastUpdated: new Date().toISOString(),
    players: accumulated
  };

  fs.writeFileSync(STATS_FILE, JSON.stringify(output, null, 2));
  console.log(`\nDone! Updated stats for ${Object.keys(accumulated).length} players.`);

  // Print leaderboard summary
  const participantTotals = {};
  for (const country of picks.countries) {
    for (const [participant, playerName] of Object.entries(country.picks)) {
      if (!participantTotals[participant]) participantTotals[participant] = 0;
      participantTotals[participant] += accumulated[playerName]?.points || 0;
    }
  }
  const sorted = Object.entries(participantTotals).sort((a, b) => b[1] - a[1]);
  console.log('\nLeaderboard:');
  sorted.forEach(([name, pts], i) => console.log(`  ${i + 1}. ${name}: ${pts} pts`));
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
