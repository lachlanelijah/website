const express = require('express');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { Octokit } = require('octokit');
const simpleGit = require('simple-git');
const { execFile } = require('child_process');

const app = express();
app.use(express.json());

// Configuration
const API_KEY = process.env.API_KEY || 'test-key';
const API_PORT = process.env.API_PORT || 3000;
const REPO_PATH = path.join(__dirname, '..');
const git = simpleGit(REPO_PATH);

// GitHub setup (optional - for remote commits)
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

// Middleware for API key authentication
const authenticateAPI = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== API_KEY && process.env.NODE_ENV === 'production') {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

app.use(authenticateAPI);

// ============ BOOKS ENDPOINTS ============

app.post('/api/books/add', async (req, res) => {
  try {
    const { author, title, year = new Date().getFullYear(), note = '' } = req.body;

    if (!author || !title) {
      return res.status(400).json({ error: 'Author and title are required' });
    }

    const booksPath = path.join(REPO_PATH, 'data', 'books.json');
    let books = {};
    if (fs.existsSync(booksPath)) {
      books = JSON.parse(fs.readFileSync(booksPath, 'utf8'));
    }
    if (!books[year]) books[year] = [];
    books[year].push({ author, title, note });
    fs.writeFileSync(booksPath, JSON.stringify(books, null, 2));
    execFile('node', [path.join(__dirname, 'generate_reading_html.js')], (err, stdout, stderr) => {
      if (err) console.error('Error running generate_reading_html.js:', stderr);
      else console.log(stdout.trim());
    });
    await commitChanges(`Add book: ${title} by ${author}`);
    res.json({ success: true, message: `Added "${title}" to ${year}` });
  } catch (error) {
    console.error('Error adding book:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/books/list', async (req, res) => {
  try {
    const booksPath = path.join(REPO_PATH, 'data', 'books.json');
    let books = {};
    if (fs.existsSync(booksPath)) {
      books = JSON.parse(fs.readFileSync(booksPath, 'utf8'));
    }
    res.json({ books });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ CONCERTS ENDPOINTS ============

app.post('/api/concerts/add', async (req, res) => {
  try {
    const { artist, date, venue, songs = [] } = req.body;

    if (!artist || !date || !venue) {
      return res.status(400).json({ error: 'Artist, date, and venue are required' });
    }

    const setlistPath = path.join(REPO_PATH, 'data', 'setlists.json');
    let data = JSON.parse(fs.readFileSync(setlistPath, 'utf8'));

    const key = `${artist}|${date}`;
    data[key] = {
      source: '',
      url: '',
      songs: Array.isArray(songs) ? songs : songs.split(',').map(s => s.trim())
    };

    fs.writeFileSync(setlistPath, JSON.stringify(data, null, 2));
    execFile('node', [path.join(__dirname, 'generate_concerts_html.js')], (err, stdout, stderr) => {
      if (err) console.error('Error running generate_concerts_html.js:', stderr);
      else console.log(stdout.trim());
    });
    await commitChanges(`Add concert: ${artist} on ${date} at ${venue}`);
    res.json({ success: true, message: `Added ${artist} concert` });
  } catch (error) {
    console.error('Error adding concert:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/concerts/list', async (req, res) => {
  try {
    const setlistPath = path.join(REPO_PATH, 'data', 'setlists.json');
    const data = JSON.parse(fs.readFileSync(setlistPath, 'utf8'));

    const concerts = Object.entries(data).map(([key, value]) => {
      const [artist, date] = key.split('|');
      return {
        artist,
        date,
        songs: value.songs,
        url: value.url
      };
    });

    res.json({ concerts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ TV SHOWS ENDPOINTS ============
// ============ TRAVEL ENDPOINTS ============

app.post('/api/travel/add', async (req, res) => {
  try {
    const { type = 'major', title, link = '', extra = '' } = req.body;
    const travelPath = path.join(REPO_PATH, 'data', 'travel.json');
    let travel = {};
    if (fs.existsSync(travelPath)) {
      travel = JSON.parse(fs.readFileSync(travelPath, 'utf8'));
    }
    if (type === 'upcoming') {
      if (!travel.upcoming) travel.upcoming = [];
      travel.upcoming.push(title);
    } else {
      if (!travel.major) travel.major = [];
      const entry = { title };
      if (link) entry.link = link;
      if (extra) entry.extra = extra;
      travel.major.push(entry);
    }
    fs.writeFileSync(travelPath, JSON.stringify(travel, null, 2));
    execFile('node', [path.join(__dirname, 'generate_travel_html.js')], (err, stdout, stderr) => {
      if (err) console.error('Error running generate_travel_html.js:', stderr);
      else console.log(stdout.trim());
    });
    await commitChanges(`Add travel: ${title}`);
    res.json({ success: true, message: `Added travel entry: ${title}` });
  } catch (error) {
    console.error('Error adding travel:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/travel/list', async (req, res) => {
  try {
    const travelPath = path.join(REPO_PATH, 'data', 'travel.json');
    let travel = {};
    if (fs.existsSync(travelPath)) {
      travel = JSON.parse(fs.readFileSync(travelPath, 'utf8'));
    }
    res.json(travel);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/tv/add', async (req, res) => {
  try {
    const { show, year = new Date().getFullYear(), type = 'watched' } = req.body;

    if (!show) {
      return res.status(400).json({ error: 'Show name is required' });
    }

    const tvPath = path.join(REPO_PATH, 'data', 'tv.json');
    let tv = {};
    if (fs.existsSync(tvPath)) {
      tv = JSON.parse(fs.readFileSync(tvPath, 'utf8'));
    }
    if (type === 'watched') {
      if (!tv[year]) tv[year] = [];
      tv[year].push(show);
    } else {
      if (!tv['toWatch']) tv['toWatch'] = [];
      tv['toWatch'].push(show);
    }
    fs.writeFileSync(tvPath, JSON.stringify(tv, null, 2));
    execFile('node', [path.join(__dirname, 'generate_tv_html.js')], (err, stdout, stderr) => {
      if (err) console.error('Error running generate_tv_html.js:', stderr);
      else console.log(stdout.trim());
    });
    await commitChanges(`Add TV show: ${show}`);
    res.json({ success: true, message: `Added "${show}"` });
  } catch (error) {
    console.error('Error adding TV show:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/tv/list', async (req, res) => {
  try {
    const tvPath = path.join(REPO_PATH, 'data', 'tv.json');
    let tv = {};
    if (fs.existsSync(tvPath)) {
      tv = JSON.parse(fs.readFileSync(tvPath, 'utf8'));
    }
    res.json(tv);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ UTILITY ENDPOINTS ============

app.get('/api/status', (req, res) => {
  res.json({ 
    status: 'API running',
    port: API_PORT,
    baseDir: REPO_PATH
  });
});

app.post('/api/commit', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Commit message required' });
    }

    await commitChanges(message);
    res.json({ success: true, message: 'Changes committed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ HELPER FUNCTIONS ============

async function commitChanges(message) {
  try {
    // Check if there are changes
    const status = await git.status();
    
    if (status.files.length === 0) {
      return { message: 'No changes to commit' };
    }

    // Configure git user if not already configured
    try {
      await git.addConfig('user.name', process.env.GIT_USER_NAME || 'API Bot');
      await git.addConfig('user.email', process.env.GIT_USER_EMAIL || 'api@example.com');
    } catch (e) {
      // User might already be configured
    }

    // Add and commit changes
    await git.add('.');
    await git.commit(message);

    console.log(`Committed: ${message}`);
    // Automatically push to origin main
    try {
      await git.push('origin', 'main')
      console.log('Pushed to origin main')
    } catch (pushErr) {
      console.error('Git push error:', pushErr.message)
    }
    return { success: true, message };
  } catch (error) {
    console.error('Git commit error:', error.message);
    // Don't throw - allow the request to succeed even if git commit fails
    return { warning: 'Changes made but git commit failed', error: error.message };
  }
}

// ============ START SERVER ============

app.listen(API_PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║      Website API Server Running        ║
╚════════════════════════════════════════╝

📡 Server: http://localhost:${API_PORT}
🔑 API Key: ${API_KEY}
📁 Repo: ${REPO_PATH}

Example requests:
  POST http://localhost:${API_PORT}/api/books/add
  POST http://localhost:${API_PORT}/api/concerts/add
  POST http://localhost:${API_PORT}/api/tv/add

Set X-API-Key header with: ${API_KEY}
  `);
});

module.exports = app;
