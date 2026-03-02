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
    const { firstName, lastName, title, year = new Date().getFullYear(), note = '' } = req.body;

    if (!firstName || !lastName || !title) {
      return res.status(400).json({ error: 'First name, last name, and title are required' });
    }

    const booksPath = path.join(REPO_PATH, 'data', 'books.json');
    let books = [];
    if (fs.existsSync(booksPath)) {
      books = JSON.parse(fs.readFileSync(booksPath, 'utf8'));
    }
    books.push({ firstName, lastName, title, year, note });
    fs.writeFileSync(booksPath, JSON.stringify(books, null, 2));
    execFile('node', [path.join(__dirname, 'generate_reading_html.js')], (err, stdout, stderr) => {
      if (err) console.error('Error running generate_reading_html.js:', stderr);
      else console.log(stdout.trim());
    });
    await commitChanges(`Add book: ${title} by ${firstName} ${lastName}`);
    res.json({ success: true, message: `Added "${title}" to ${year}` });
  } catch (error) {
    console.error('Error adding book:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/books/list', async (req, res) => {
  try {
    const booksPath = path.join(REPO_PATH, 'data', 'books.json');
    let books = [];
    if (fs.existsSync(booksPath)) {
      books = JSON.parse(fs.readFileSync(booksPath, 'utf8'));
    }
    res.json({ books });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ BOOKS UPDATE/DELETE ============
app.post('/api/books/update', async (req, res) => {
  try {
    const { oldFirstName, oldLastName, oldTitle, firstName, lastName, title, year, note } = req.body;
    const booksPath = path.join(REPO_PATH, 'data', 'books.json');
    let books = JSON.parse(fs.readFileSync(booksPath, 'utf8'));
    const idx = books.findIndex(b => b.firstName === oldFirstName && b.lastName === oldLastName && b.title === oldTitle);
    if (idx === -1) return res.status(404).json({ error: 'Book not found' });
    books[idx] = { firstName, lastName, title, year, note };
    fs.writeFileSync(booksPath, JSON.stringify(books, null, 2));
    execFile('node', [path.join(__dirname, 'generate_reading_html.js')], () => {});
    await commitChanges(`Update book: ${oldTitle} to ${title}`);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.post('/api/books/delete', async (req, res) => {
  try {
    const { firstName, lastName, title } = req.body;
    const booksPath = path.join(REPO_PATH, 'data', 'books.json');
    let books = JSON.parse(fs.readFileSync(booksPath, 'utf8'));
    books = books.filter(b => !(b.firstName === firstName && b.lastName === lastName && b.title === title));
    fs.writeFileSync(booksPath, JSON.stringify(books, null, 2));
    execFile('node', [path.join(__dirname, 'generate_reading_html.js')], () => {});
    await commitChanges(`Delete book: ${title}`);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ CONCERTS ENDPOINTS ============

app.post('/api/concerts/add', async (req, res) => {
  try {
    const { band, date, venue, support = [], setlist = { source: '', url: '', songs: [] } } = req.body;

    if (!band || !date || !venue) {
      return res.status(400).json({ error: 'Band, date, and venue are required' });
    }

    const concertsPath = path.join(REPO_PATH, 'data', 'concerts.json');
    let concerts = [];
    if (fs.existsSync(concertsPath)) {
      concerts = JSON.parse(fs.readFileSync(concertsPath, 'utf8'));
    }
    concerts.push({ band, date, venue, support, setlist });
    fs.writeFileSync(concertsPath, JSON.stringify(concerts, null, 2));
    execFile('node', [path.join(__dirname, 'generate_concerts_html.js')], (err, stdout, stderr) => {
      if (err) console.error('Error running generate_concerts_html.js:', stderr);
      else console.log(stdout.trim());
    });
    await commitChanges(`Add concert: ${band} on ${date} at ${venue}`);
    res.json({ success: true, message: `Added ${band} concert` });
  } catch (error) {
    console.error('Error adding concert:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/concerts/list', async (req, res) => {
  try {
    const concertsPath = path.join(REPO_PATH, 'data', 'concerts.json');
    let concerts = [];
    if (fs.existsSync(concertsPath)) {
      concerts = JSON.parse(fs.readFileSync(concertsPath, 'utf8'));
    }
    res.json({ concerts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ CONCERTS UPDATE/DELETE ============
app.post('/api/concerts/update', async (req, res) => {
  try {
    const { oldBand, oldDate, band, date, venue, support = [], setlist = { source: '', url: '', songs: [] } } = req.body;
    const concertsPath = path.join(REPO_PATH, 'data', 'concerts.json');
    let concerts = JSON.parse(fs.readFileSync(concertsPath, 'utf8'));
    const idx = concerts.findIndex(c => c.band === oldBand && c.date === oldDate);
    if (idx === -1) return res.status(404).json({ error: 'Concert not found' });
    concerts[idx] = { band, date, venue, support, setlist };
    fs.writeFileSync(concertsPath, JSON.stringify(concerts, null, 2));
    execFile('node', [path.join(__dirname, 'generate_concerts_html.js')], () => {});
    await commitChanges(`Update concert: ${oldBand} ${oldDate}`);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.post('/api/concerts/delete', async (req, res) => {
  try {
    const { band, date } = req.body;
    const concertsPath = path.join(REPO_PATH, 'data', 'concerts.json');
    let concerts = JSON.parse(fs.readFileSync(concertsPath, 'utf8'));
    concerts = concerts.filter(c => !(c.band === band && c.date === date));
    fs.writeFileSync(concertsPath, JSON.stringify(concerts, null, 2));
    execFile('node', [path.join(__dirname, 'generate_concerts_html.js')], () => {});
    await commitChanges(`Delete concert: ${band} ${date}`);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/concerts/update-setlist', async (req, res) => {
  try {
    const { band, date, setlist } = req.body;
    if (!band || !date || !Array.isArray(setlist)) {
      return res.status(400).json({ error: 'Band, date, and setlist array are required' });
    }
    const concertsPath = path.join(REPO_PATH, 'data', 'concerts.json');
    let concerts = {};
    if (fs.existsSync(concertsPath)) {
      concerts = JSON.parse(fs.readFileSync(concertsPath, 'utf8'));
    }
    let updated = false;
    Object.keys(concerts).forEach(year => {
      concerts[year].forEach(concert => {
        if (concert.band === band && concert.date === date) {
          concert.setlist = setlist;
          updated = true;
        }
      });
    });
    if (!updated) {
      return res.status(404).json({ error: 'Concert not found' });
    }
    fs.writeFileSync(concertsPath, JSON.stringify(concerts, null, 2));
    res.json({ success: true });
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
    const { show, year = new Date().getFullYear(), type = 'watched', seasons = [] } = req.body;
    const tvPath = path.join(REPO_PATH, 'data', 'tv.json');
    let tv = fs.existsSync(tvPath) ? JSON.parse(fs.readFileSync(tvPath, 'utf8')) : {};
    if (type === 'watched') {
      if (!tv[year]) tv[year] = [];
      tv[year].push({ show, seasons });
    }
    fs.writeFileSync(tvPath, JSON.stringify(tv, null, 2));
    execFile('node', [path.join(__dirname, 'generate_tv_html.js')], () => {});
    await commitChanges(`Add TV show: ${show}`);
    res.json({ success: true, message: `Added "${show}"` });
  } catch (error) {
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

// ============ TV UPDATE/DELETE ============
app.post('/api/tv/update', async (req, res) => {
  try {
    const { year, oldShow, show, type, seasons = [] } = req.body;
    const tvPath = path.join(REPO_PATH, 'data', 'tv.json');
    let tv = fs.existsSync(tvPath) ? JSON.parse(fs.readFileSync(tvPath, 'utf8')) : {};
    if (type === 'watched') {
      if (!tv[year]) return res.status(404).json({ error: 'Year not found' });
      const idx = tv[year].findIndex(s => s.show === oldShow);
      if (idx === -1) return res.status(404).json({ error: 'Show not found' });
      tv[year][idx] = { show, seasons };
    }
    fs.writeFileSync(tvPath, JSON.stringify(tv, null, 2));
    execFile('node', [path.join(__dirname, 'generate_tv_html.js')], () => {});
    await commitChanges(`Update TV show: ${oldShow}`);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.post('/api/tv/delete', async (req, res) => {
  try {
    const { year, show, type } = req.body;
    const tvPath = path.join(REPO_PATH, 'data', 'tv.json');
    let tv = fs.existsSync(tvPath) ? JSON.parse(fs.readFileSync(tvPath, 'utf8')) : {};
    if (type === 'watched') {
      if (!tv[year]) return res.status(404).json({ error: 'Year not found' });
      tv[year] = tv[year].filter(s => s.show !== show);
    }
    fs.writeFileSync(tvPath, JSON.stringify(tv, null, 2));
    execFile('node', [path.join(__dirname, 'generate_tv_html.js')], () => {});
    await commitChanges(`Delete TV show: ${show}`);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ TRAVEL UPDATE/DELETE ============
app.post('/api/travel/update', async (req, res) => {
  try {
    const { type, oldTitle, title, link, extra } = req.body;
    const travelPath = path.join(REPO_PATH, 'data', 'travel.json');
    let travel = JSON.parse(fs.readFileSync(travelPath, 'utf8'));
    if (type === 'upcoming') {
      if (!travel.upcoming) return res.status(404).json({ error: 'Upcoming not found' });
      const idx = travel.upcoming.findIndex(t => t === oldTitle);
      if (idx === -1) return res.status(404).json({ error: 'Trip not found' });
      travel.upcoming[idx] = title;
    } else {
      if (!travel.major) return res.status(404).json({ error: 'Major not found' });
      const idx = travel.major.findIndex(t => t.title === oldTitle);
      if (idx === -1) return res.status(404).json({ error: 'Trip not found' });
      travel.major[idx] = { title, link, extra };
    }
    fs.writeFileSync(travelPath, JSON.stringify(travel, null, 2));
    execFile('node', [path.join(__dirname, 'generate_travel_html.js')], () => {});
    await commitChanges(`Update travel: ${oldTitle}`);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.post('/api/travel/delete', async (req, res) => {
  try {
    const { type, title } = req.body;
    const travelPath = path.join(REPO_PATH, 'data', 'travel.json');
    let travel = JSON.parse(fs.readFileSync(travelPath, 'utf8'));
    if (type === 'upcoming') {
      if (!travel.upcoming) return res.status(404).json({ error: 'Upcoming not found' });
      travel.upcoming = travel.upcoming.filter(t => t !== title);
    } else {
      if (!travel.major) return res.status(404).json({ error: 'Major not found' });
      travel.major = travel.major.filter(t => t.title !== title);
    }
    fs.writeFileSync(travelPath, JSON.stringify(travel, null, 2));
    execFile('node', [path.join(__dirname, 'generate_travel_html.js')], () => {});
    await commitChanges(`Delete travel: ${title}`);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ TRAVEL TRIP & ENTRY ENDPOINTS ============
app.post('/api/travel/trip/add', async (req, res) => {
  try {
    const { title, start, end } = req.body;
    const travelPath = path.join(REPO_PATH, 'data', 'travel.json');
    let travel = fs.existsSync(travelPath) ? JSON.parse(fs.readFileSync(travelPath, 'utf8')) : {};
    if (!travel.trips) travel.trips = [];
    travel.trips.push({ title, start, end, entries: [] });
    fs.writeFileSync(travelPath, JSON.stringify(travel, null, 2));
    execFile('node', [path.join(__dirname, 'generate_travel_html.js')], () => {});
    await commitChanges(`Add trip: ${title}`);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.post('/api/travel/trip/update', async (req, res) => {
  try {
    const { oldTitle, title, start, end } = req.body;
    const travelPath = path.join(REPO_PATH, 'data', 'travel.json');
    let travel = fs.existsSync(travelPath) ? JSON.parse(fs.readFileSync(travelPath, 'utf8')) : {};
    if (!travel.trips) return res.status(404).json({ error: 'No trips found' });
    const idx = travel.trips.findIndex(t => t.title === oldTitle);
    if (idx === -1) return res.status(404).json({ error: 'Trip not found' });
    travel.trips[idx].title = title;
    travel.trips[idx].start = start;
    travel.trips[idx].end = end;
    fs.writeFileSync(travelPath, JSON.stringify(travel, null, 2));
    execFile('node', [path.join(__dirname, 'generate_travel_html.js')], () => {});
    await commitChanges(`Update trip: ${oldTitle}`);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.post('/api/travel/trip/delete', async (req, res) => {
  try {
    const { title } = req.body;
    const travelPath = path.join(REPO_PATH, 'data', 'travel.json');
    let travel = fs.existsSync(travelPath) ? JSON.parse(fs.readFileSync(travelPath, 'utf8')) : {};
    if (!travel.trips) return res.status(404).json({ error: 'No trips found' });
    travel.trips = travel.trips.filter(t => t.title !== title);
    fs.writeFileSync(travelPath, JSON.stringify(travel, null, 2));
    execFile('node', [path.join(__dirname, 'generate_travel_html.js')], () => {});
    await commitChanges(`Delete trip: ${title}`);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.post('/api/travel/entry/add', async (req, res) => {
  try {
    const { tripTitle, date, location, text } = req.body;
    const travelPath = path.join(REPO_PATH, 'data', 'travel.json');
    let travel = fs.existsSync(travelPath) ? JSON.parse(fs.readFileSync(travelPath, 'utf8')) : {};
    if (!travel.trips) return res.status(404).json({ error: 'No trips found' });
    const trip = travel.trips.find(t => t.title === tripTitle);
    if (!trip) return res.status(404).json({ error: 'Trip not found' });
    trip.entries.push({ date, location, text });
    fs.writeFileSync(travelPath, JSON.stringify(travel, null, 2));
    execFile('node', [path.join(__dirname, 'generate_travel_html.js')], () => {});
    await commitChanges(`Add entry to trip: ${tripTitle}`);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.post('/api/travel/entry/update', async (req, res) => {
  try {
    const { tripTitle, oldDate, oldLocation, date, location, text } = req.body;
    const travelPath = path.join(REPO_PATH, 'data', 'travel.json');
    let travel = fs.existsSync(travelPath) ? JSON.parse(fs.readFileSync(travelPath, 'utf8')) : {};
    if (!travel.trips) return res.status(404).json({ error: 'No trips found' });
    const trip = travel.trips.find(t => t.title === tripTitle);
    if (!trip) return res.status(404).json({ error: 'Trip not found' });
    const idx = trip.entries.findIndex(e => e.date === oldDate && e.location === oldLocation);
    if (idx === -1) return res.status(404).json({ error: 'Entry not found' });
    trip.entries[idx] = { date, location, text };
    fs.writeFileSync(travelPath, JSON.stringify(travel, null, 2));
    execFile('node', [path.join(__dirname, 'generate_travel_html.js')], () => {});
    await commitChanges(`Update entry in trip: ${tripTitle}`);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.post('/api/travel/entry/delete', async (req, res) => {
  try {
    const { tripTitle, date, location } = req.body;
    const travelPath = path.join(REPO_PATH, 'data', 'travel.json');
    let travel = fs.existsSync(travelPath) ? JSON.parse(fs.readFileSync(travelPath, 'utf8')) : {};
    if (!travel.trips) return res.status(404).json({ error: 'No trips found' });
    const trip = travel.trips.find(t => t.title === tripTitle);
    if (!trip) return res.status(404).json({ error: 'Trip not found' });
    trip.entries = trip.entries.filter(e => !(e.date === date && e.location === location));
    fs.writeFileSync(travelPath, JSON.stringify(travel, null, 2));
    execFile('node', [path.join(__dirname, 'generate_travel_html.js')], () => {});
    await commitChanges(`Delete entry from trip: ${tripTitle}`);
    res.json({ success: true });
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
