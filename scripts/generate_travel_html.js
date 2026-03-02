// Script to generate travel.html from travel.json
const fs = require('fs');
const path = require('path');

const repoPath = path.join(__dirname, '..');
const travelPath = path.join(repoPath, 'data', 'travel.json');
const htmlPath = path.join(repoPath, 'travel.html');

const travel = JSON.parse(fs.readFileSync(travelPath, 'utf8'));
let html = fs.readFileSync(htmlPath, 'utf8');

// Remove old travel sections
html = html.replace(/<section>[\s\S]*?<\/section>/g, '');

const footerIndex = html.indexOf('<footer>');
const beforeFooter = html.slice(0, footerIndex);
const afterFooter = html.slice(footerIndex);

// Generate new travel sections
let sections = '';
if (travel.upcoming && travel.upcoming.length) {
  sections += '  <section>\n    <h2>&gt; Upcoming Trips</h2>\n    <ul>\n';
  travel.upcoming.forEach(trip => {
    sections += `      <li>${trip}</li>\n`;
  });
  sections += '    </ul>\n  </section>\n';
}
if (travel.major && travel.major.length) {
  sections += '  <section>\n    <h2>&gt; Trips — Major recent itineraries</h2>\n    <ul>\n';
  travel.major.forEach(trip => {
    if (trip.link) {
      sections += `      <li><a href="${trip.link}">${trip.title}</a></li>\n`;
    } else {
      sections += `      <li>${trip.title}</li>\n`;
    }
  });
  sections += '    </ul>\n  </section>\n';
}

const newHtml = beforeFooter + sections + afterFooter;
fs.writeFileSync(htmlPath, newHtml);
console.log('travel.html updated from travel.json');
