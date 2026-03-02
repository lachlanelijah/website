// Script to generate concerts.html from concerts.json
const fs = require('fs');
const path = require('path');

const repoPath = path.join(__dirname, '..');
const concertsJsonPath = path.join(repoPath, 'data', 'concerts.json');
const concerts = JSON.parse(fs.readFileSync(concertsJsonPath, 'utf8'));

// Group concerts by year (from date field)
const concertsByYear = {};
concerts.forEach(concert => {
  const year = concert.date.slice(0, 4);
  if (!concertsByYear[year]) concertsByYear[year] = [];
  concertsByYear[year].push(concert);
});

let sections = '';
Object.keys(concertsByYear).sort((a, b) => b - a).forEach(year => {
  sections += `  <section>\n    <h2>&gt; ${year}</h2>\n`;
  concertsByYear[year]
    .sort((a, b) => b.date.localeCompare(a.date))
    .forEach(concert => {
    sections += `    <div class="show-title"><strong>${concert.band}</strong></div>\n`;
    sections += `    <div><span style="color:var(--muted)">Date:</span> ${concert.date}</div>\n`;
    sections += `    <div><span style="color:var(--muted)">Venue:</span> ${concert.venue}</div>\n`;
    if (concert.support && concert.support.length) {
      sections += `    <div><span style="color:var(--muted)">Openers:</span> ${concert.support.join(', ')}</div>\n`;
    }
    if (concert.setlist && concert.setlist.songs && concert.setlist.songs.length) {
      sections += `    <details><summary>Setlist</summary>\n`;
      sections += `      <ol class="setlist-songs">`;
      concert.setlist.songs.forEach(song => {
        sections += `<li>${song}</li>`;
      });
      sections += `</ol>\n`;
      if (concert.setlist.url) {
        sections += `      <div style="font-size:11px;color:var(--muted);margin-top:4px"><a href="${concert.setlist.url}" target="_blank">View on setlist.fm</a></div>\n`;
      }
      sections += '    </details>\n';
    }
  });
  sections += '  </section>\n';
});

const htmlPath = path.join(repoPath, 'concerts.html');
let html = fs.readFileSync(htmlPath, 'utf8');

// Remove old concert sections
html = html.replace(/<section>[\s\S]*?<\/section>/g, '');

const footerIndex = html.indexOf('<footer>');
const beforeFooter = html.slice(0, footerIndex);
const afterFooter = html.slice(footerIndex);

const newHtml = beforeFooter + sections + afterFooter;
fs.writeFileSync(htmlPath, newHtml);
console.log('concerts.html updated from concerts.json');
