const fs = require('fs');

async function analyzeDatesAndScores() {
  const SUPABASE_URL = 'https://lezoaunsbfgrbcskedoq.supabase.co';
  const html = await fetch('https://msoelibrary.vercel.app/leaderboard').then(r => r.text());
  const jsCode = await fetch('https://msoelibrary.vercel.app' + html.match(/src="(\/assets\/[^"]+\.js)"/)[1]).then(r => r.text());
  const anonKey = jsCode.match(/eyJhbGciOi[a-zA-Z0-9_\-\.]+/)[0];
  const headers = { apikey: anonKey, Authorization: `Bearer ${anonKey}` };

  const [settingsRes, booksRes, borrowRes] = await Promise.all([
    fetch(`${SUPABASE_URL}/rest/v1/admin_settings?select=*&limit=1`, { headers }).then(r => r.json()),
    fetch(`${SUPABASE_URL}/rest/v1/books?select=*&order=average_rating.desc&limit=10000`, { headers }).then(r => r.json()),
    fetch(`${SUPABASE_URL}/rest/v1/borrow_records?select=*&order=created_at.desc&limit=10000`, { headers }).then(r => r.json())
  ]);

  const settings = settingsRes[0] || {};
  const scoringTable = settings.scoring_table || {};
  const reviewPointsDefault = settings.review_points_default ?? 10;

  console.log('Total borrow records:', borrowRes.length);

  // Check unique borrowers
  const borrowers = [...new Set(borrowRes.map(b => b.borrower_name?.trim()).filter(Boolean))];
  console.log('Unique borrowers count:', borrowers.length);

  // Check for Adhil Ameen all records
  const adhil = borrowRes.filter(b => b.borrower_name?.trim() === 'ADHIL AMEEN');
  console.log('ADHIL AMEEN records:');
  console.log(adhil.map(b => ({
    title: b.book_title,
    read_status: b.read_status,
    review_conducted: b.review_conducted,
    review_points: b.review_points,
    borrowed_date: b.borrowed_date,
    created_at: b.created_at
  })));

  // Check Muhammed Ansil AP
  const ansil = borrowRes.filter(b => b.borrower_name?.trim() === 'MUHAMMED ANSIL AP');
  console.log('MUHAMMED ANSIL AP records:');
  console.log(ansil.map(b => ({
    title: b.book_title,
    read_status: b.read_status,
    review_conducted: b.review_conducted,
    borrowed_date: b.borrowed_date
  })));

  // Check CK Muhammed Nafeeh
  const nafeeh = borrowRes.filter(b => b.borrower_name?.trim() === 'CK MUHAMMED NAFEEH');
  console.log('CK MUHAMMED NAFEEH records:');
  console.log(nafeeh.map(b => ({
    title: b.book_title,
    read_status: b.read_status,
    review_conducted: b.review_conducted,
    borrowed_date: b.borrowed_date
  })));

  // Check Muhammed Swalih
  const swalih = borrowRes.filter(b => b.borrower_name?.trim() === 'MUHAMMED SWALIH');
  console.log('MUHAMMED SWALIH records:');
  console.log(swalih.map(b => ({
    title: b.book_title,
    read_status: b.read_status,
    review_conducted: b.review_conducted,
    borrowed_date: b.borrowed_date
  })));

  // Check Muhammed Saeed P
  const saeed = borrowRes.filter(b => b.borrower_name?.trim() === 'MUHAMMED SAEED P');
  console.log('MUHAMMED SAEED P records:');
  console.log(saeed.map(b => ({
    title: b.book_title,
    read_status: b.read_status,
    review_conducted: b.review_conducted,
    borrowed_date: b.borrowed_date
  })));
}

analyzeDatesAndScores();
