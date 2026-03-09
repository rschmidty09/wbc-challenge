const fs = require('fs');
const path = require('path');

// Read token directly from .env file
const envPath = path.join(__dirname, '..', 'RiskScoreApp', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const tokenMatch = envContent.match(/GITHUB_TOKEN=(.+)/);
const TOKEN = tokenMatch[1].trim();

const REPO = 'rschmidty09/wbc-challenge';
const FILE = '.github/workflows/update-stats.yml';

const content = `name: Update WBC Stats

on:
  schedule:
    - cron: '0 4 * * *'
  workflow_dispatch:

jobs:
  update:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Fetch WBC stats
        run: node update-stats.js
      - name: Commit stats
        run: |
          git config user.email "wbc-bot@users.noreply.github.com"
          git config user.name "WBC Stats Bot"
          git add stats.json
          git diff --staged --quiet || git commit -m "Stats update $(date -u +'%Y-%m-%d %H:%M UTC')"
          git push
`;

async function run() {
  const encoded = Buffer.from(content).toString('base64');
  const url = `https://api.github.com/repos/${REPO}/contents/${FILE}`;
  console.log('Token prefix:', TOKEN.substring(0, 10));
  console.log('PUT', url);

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `token ${TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: 'Add nightly stats update workflow',
      content: encoded,
    }),
  });
  const data = await res.json();
  console.log('Status:', res.status);
  if (res.ok) {
    console.log('Workflow created:', data.content?.html_url);
  } else {
    console.error('Failed:', JSON.stringify(data));
  }
}
run();
