const fs = require('fs');

const borrowRes = JSON.parse(fs.readFileSync('src/scratch/borrow_records.json', 'utf8'));
const booksRes = JSON.parse(fs.readFileSync('src/scratch/books.json', 'utf8'));

console.log('Books count:', booksRes.length);
console.log('Sample book id:', booksRes[0].id, 'title:', booksRes[0].title);

let matchedById = 0;
let matchedByTitle = 0;
let unmatched = 0;

const booksById = new Map(booksRes.map(b => [b.id, b]));
const booksByTitle = new Map(booksRes.map(b => [(b.title || '').trim().toLowerCase(), b]));

for (const rec of borrowRes) {
  if (booksById.has(rec.book_id)) {
    matchedById++;
  } else if (booksByTitle.has((rec.book_title || '').trim().toLowerCase())) {
    matchedByTitle++;
  } else {
    unmatched++;
    console.log('Unmatched record:', {
      borrower: rec.borrower_name,
      book_id: rec.book_id,
      book_title: rec.book_title
    });
  }
}

console.log({ matchedById, matchedByTitle, unmatched, total: borrowRes.length });
