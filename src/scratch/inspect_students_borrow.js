const fs = require('fs');

const borrowRes = JSON.parse(fs.readFileSync('src/scratch/borrow_records.json', 'utf8'));
const booksRes = JSON.parse(fs.readFileSync('src/scratch/books.json', 'utf8'));
const settingsRes = JSON.parse(fs.readFileSync('src/scratch/settings.json', 'utf8'));

const booksMap = new Map(booksRes.map(b => [b.id, b]));

const namesToCheck = [
  'ADHIL AMEEN',
  'MUHAMMED ANSIL AP',
  'CK MUHAMMED NAFEEH',
  'MUHAMMED SWALIH',
  'MUHAMMED SAEED P',
  'THWUFAILUL MASHHOOD',
  'ABDUL MAJID P',
  'DHANEEN JAVAD',
  'HANEEN KT',
  'UMAR ABDULLA'
];

for (const name of namesToCheck) {
  const matching = borrowRes.filter(r => (r.borrower_name || '').toUpperCase().includes(name));
  console.log(`=== Matches for ${name} (${matching.length} records) ===`);
  matching.forEach(r => {
    const book = booksMap.get(r.book_id);
    console.log({
      id: r.id,
      name: r.borrower_name,
      class: r.borrower_class,
      book_title: r.book_title,
      read_status: r.read_status,
      review_conducted: r.review_conducted,
      review_points: r.review_points,
      borrowed_date: r.borrowed_date,
      book_category: book?.category,
      book_pages: book?.pages
    });
  });
}
