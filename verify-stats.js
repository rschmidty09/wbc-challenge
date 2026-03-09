// Find the actual API names for mismatched players by searching box scores
const SUSPECTS = ['ahn', 'herrera', 'caballero', 'moncada', 'acuna'];

async function main() {
  const sched = await fetch('https://statsapi.mlb.com/api/v1/schedule?sportId=51&season=2026&startDate=2026-03-01&endDate=2026-04-30').then(r => r.json());
  const gamePks = (sched.dates || []).flatMap(d => d.games || [])
    .filter(g => g.status?.abstractGameState === 'Final').map(g => g.gamePk);

  const found = {};
  for (const pk of gamePks) {
    const bs = await fetch(`https://statsapi.mlb.com/api/v1/game/${pk}/boxscore`).then(r => r.json());
    const away = bs.teams?.away?.team?.name;
    const home = bs.teams?.home?.team?.name;
    for (const side of ['home', 'away']) {
      for (const [, p] of Object.entries(bs.teams?.[side]?.players || {})) {
        const name = p.person?.fullName;
        if (!name) continue;
        const lower = name.toLowerCase();
        for (const s of SUSPECTS) {
          if (lower.includes(s)) {
            const bat = p.stats?.batting;
            const ab = bat?.atBats || 0;
            const hits = bat?.hits || 0;
            if (!found[name]) found[name] = { teams: new Set(), ab: 0, hits: 0 };
            found[name].teams.add(side === 'home' ? home : away);
            found[name].ab += ab;
            found[name].hits += hits;
          }
        }
      }
    }
  }

  console.log('Players matching suspect last names:');
  for (const [name, info] of Object.entries(found)) {
    console.log(`  "${name}" — teams: ${[...info.teams].join(', ')} | AB: ${info.ab} H: ${info.hits}`);
  }
}
main().catch(e => console.error(e.message));
