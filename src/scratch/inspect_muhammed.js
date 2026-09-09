const fs = require('fs');

const borrowRes = JSON.parse(fs.readFileSync('src/scratch/borrow_records.json', 'utf8'));
const booksRes = JSON.parse(fs.readFileSync('src/scratch/all_books.json', 'utf8'));
const booksMap = new Map(booksRes.map(b => [b.id, b]));

const muhammedRecords = borrowRes.filter(r => (r.borrower_name || '').trim() === 'MUHAMMED');
console.log('Muhammed records:', muhammedRecords.map(r => ({
  name: r.borrower_name,
  class: r.borrower_class,
  book: r.book_title,
  date: r.borrowed_date,
  status: r.read_status,
  category: booksMap.get(r.book_id)?.category,
  pages: booksMap.get(r.book_id)?.pages
})));
