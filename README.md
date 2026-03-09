# WBC Challenge 2026

Public scoreboard for the office WBC picks game.

## One-time GitHub Pages setup (5 minutes)

1. Go to https://github.com/new and create a **public** repo named `wbc-challenge`
2. Open a terminal in this folder and run:
   ```
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/wbc-challenge.git
   git push -u origin main
   ```
3. On GitHub: **Settings → Pages → Source: Deploy from branch → main → / (root) → Save**
4. Your site will be live at: `https://YOUR_USERNAME.github.io/wbc-challenge/`

Stats update automatically every night at 10pm CST via GitHub Actions.
You can also trigger a manual update anytime: **Actions tab → Update WBC Stats → Run workflow**.

## Local server (optional)
```
npm install
node server.js
```
Then open http://localhost:3002
