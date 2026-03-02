// Script to generate tv.html from tv.json
const fs = require('fs');
const path = require('path');

const repoPath = path.join(__dirname, '..');
const tvPath = path.join(repoPath, 'data', 'tv.json');
const htmlPath = path.join(repoPath, 'tv.html');

const tv = JSON.parse(fs.readFileSync(tvPath, 'utf8'));
let html = fs.readFileSync(htmlPath, 'utf8');

// Remove old TV sections
html = html.replace(/<section>[\s\S]*?<\/section>/g, '');

const footerIndex = html.indexOf('<footer>');
const beforeFooter = html.slice(0, footerIndex);
const afterFooter = html.slice(footerIndex);

// Generate new TV sections
let sections = '';
if (tv.toWatch && tv.toWatch.length) {
  sections += '  <section>\n    <h2>&gt; To Watch</h2>\n    <div class="list-grid">\n';
  tv.toWatch.forEach(show => {
    sections += `      <div class="card">${show}</div>\n`;
  });
  sections += '    </div>\n  </section>\n';
}
Object.keys(tv).filter(y => y !== 'toWatch').sort((a, b) => b - a).forEach(year => {
  sections += `  <section>\n    <h2>&gt; Watched — ${year}</h2>\n    <ul>\n`;
  tv[year].forEach(show => {
    sections += `      <li>${show}</li>\n`;
  });
  sections += '    </ul>\n  </section>\n';
});

const newHtml = beforeFooter + sections + afterFooter;
fs.writeFileSync(htmlPath, newHtml);
console.log('tv.html updated from tv.json');
