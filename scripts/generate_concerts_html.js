// Script to generate concerts.html from setlists.json
const fs = require('fs');
const path = require('path');

const repoPath = path.join(__dirname, '..');
const concertsPath = path.join(repoPath, 'data', 'setlists.json');
const htmlPath = path.join(repoPath, 'concerts.html');

const setlists = JSON.parse(fs.readFileSync(concertsPath, 'utf8'));
let html = fs.readFileSync(htmlPath, 'utf8');

// Remove old concert sections
html = html.replace(/<section>[\s\S]*?<\/section>/g, '');

const footerIndex = html.indexOf('<footer>');
const beforeFooter = html.slice(0, footerIndex);
const afterFooter = html.slice(footerIndex);

// Generate new concert sections
let sections = '';
Object.entries(setlists).forEach(([key, value]) => {
  const [artist, date] = key.split('|');
  sections += `  <section>\n    <h2>${artist} — ${date}</h2>\n    <ul>\n`;
  value.songs.forEach(song => {
    sections += `      <li>${song}</li>\n`;
  });
  sections += '    </ul>\n  </section>\n';
});

const newHtml = beforeFooter + sections + afterFooter;
fs.writeFileSync(htmlPath, newHtml);
console.log('concerts.html updated from setlists.json');
