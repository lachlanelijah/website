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
// Sort years descending
Object.keys(books).sort((a, b) => b - a).forEach(year => {
  sections += `  <section>\n    <h2>&gt; Read — ${year}</h2>\n`;
  // Sort books by last name, then title
  const sortedBooks = books[year].slice().sort((a, b) => {
    const lastA = (a.lastName || '').toLowerCase();
    const lastB = (b.lastName || '').toLowerCase();
    if (lastA < lastB) return -1;
    if (lastA > lastB) return 1;
    const titleA = (a.title || '').toLowerCase();
    const titleB = (b.title || '').toLowerCase();
    if (titleA < titleB) return -1;
    if (titleA > titleB) return 1;
    return 0;
  });
  sortedBooks.forEach(book => {
    const note = book.note ? ` (${book.note})` : '';
    const authorName = `${book.firstName}${book.lastName ? ' ' + book.lastName : ''}`;
    sections += `<div class="book-title"><em>${book.title}</em>${note}</div>`;
    if (authorName.trim()) {
      sections += `<div class="author-muted" style="margin-left:0.9em; padding-left:1em">${authorName}</div>`;
    }
  });
  sections += '  </section>\n';
});
html = beforeFooter + sections + afterFooter;

// Write reading.html
fs.writeFileSync(htmlPath, html, 'utf8');

console.log('Reading book sections generated successfully!');
