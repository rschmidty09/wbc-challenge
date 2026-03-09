const express = require('express');
const path = require('path');
const { execSync } = require('child_process');
const app = express();
const PORT = 3002;

app.use(express.static(path.join(__dirname, 'public')));

// Serve picks and stats as JSON APIs
app.get('/api/picks', (req, res) => {
  res.sendFile(path.join(__dirname, 'picks.json'));
});

app.get('/api/stats', (req, res) => {
  res.sendFile(path.join(__dirname, 'stats.json'));
});

// Manual trigger for stats update (useful for testing)
app.post('/api/update', (req, res) => {
  try {
    execSync(`node "${path.join(__dirname, 'update-stats.js')}"`, { timeout: 120000 });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`WBC Challenge running at http://localhost:${PORT}`);
  console.log(`Share via ngrok: ngrok http ${PORT}`);
});
