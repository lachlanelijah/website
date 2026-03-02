// Script to generate reading.html book sections from books.json
const fs = require('fs');
const path = require('path');

const repoPath = path.join(__dirname, '..');
const booksPath = path.join(repoPath, 'data', 'books.json');
const htmlPath = path.join(repoPath, 'reading.html');

// Read books.json
const books = JSON.parse(fs.readFileSync(booksPath, 'utf8'));

// Read reading.html
let html = fs.readFileSync(htmlPath, 'utf8');

// Remove old book sections
html = html.replace(/<section>[\s\S]*?<\/section>/g, '');

// Find where to insert (before <footer>)
const footerIndex = html.indexOf('<footer>');
const beforeFooter = html.slice(0, footerIndex);
const afterFooter = html.slice(footerIndex);

// Generate new book sections
let sections = '';
Object.keys(books).sort((a, b) => b - a).forEach(year => {
  sections += `  <section>\n    <h2>&gt; Read — ${year}</h2>\n    <ol>\n`;
  books[year].forEach(book => {
    const note = book.note ? ` (${book.note})` : '';
    sections += `      <li><strong>${book.author}</strong> — <em>${book.title}</em>${note}</li>\n`;
  });
  sections += '    </ol>\n  </section>\n';
});

// Rebuild HTML
const newHtml = beforeFooter + sections + afterFooter;

// Write updated reading.html
fs.writeFileSync(htmlPath, newHtml);
console.log('reading.html updated from books.json');
