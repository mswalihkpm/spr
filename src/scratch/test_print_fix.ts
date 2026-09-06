export {};
const BASE_URL = 'http://localhost:3000';

async function testPrintEndpoints() {
  console.log('--- Testing Public Student Scorecard & Print Endpoints ---');

  // 1. Fetch public student list for 'Munhim' (the student in the user's screenshot)
  const resStudents = await fetch(`${BASE_URL}/api/public/search?q=Munhim`);
  const dataStudents = await resStudents.json();
  console.log(`Found ${dataStudents.students?.length} public students matching 'Munhim'.`);

  if (dataStudents.students?.length > 0) {
    const student = dataStudents.students[0];
    console.log(`Testing Scorecard for: ${student.fullName} (ID: ${student.id})`);

    // 2. Fetch public student scorecard API
    const resScorecard = await fetch(`${BASE_URL}/api/public/student/${student.id}`);
    const dataScorecard = await resScorecard.json();
    console.log('Scorecard Profile status:', resScorecard.status);
    console.log('Student Name:', dataScorecard.profile?.student?.fullName);
    console.log('Overall SPR:', dataScorecard.profile?.overallScore ?? dataScorecard.profile?.overallSPR);
    console.log('Class Standing Rank:', dataScorecard.profile?.classRank);
    console.log('Category Wings count:', dataScorecard.profile?.categoryBreakdown?.length || dataScorecard.profile?.categoryScores?.length);

    // 3. Fetch public HTML page for student scorecard
    const resHtml = await fetch(`${BASE_URL}/student/${student.id}?print=true`);
    const html = await resHtml.text();
    console.log('Student HTML page response status:', resHtml.status);
    console.log('HTML contains scorecard-container:', html.includes('scorecard-container'));
    console.log('HTML contains print:hidden:', html.includes('print:hidden'));
  }

  // 4. Verify homepage HTML contains print:hidden
  const resHome = await fetch(`${BASE_URL}/`);
  const homeHtml = await resHome.text();
  console.log('Homepage HTML status:', resHome.status);
  console.log('Homepage contains print:hidden on hero/sections/modal:', homeHtml.includes('print:hidden'));

  // 5. Verify leaderboard HTML contains print:hidden
  const resLeaderboard = await fetch(`${BASE_URL}/leaderboard`);
  const lbHtml = await resLeaderboard.text();
  console.log('Leaderboard HTML status:', resLeaderboard.status);
  console.log('Leaderboard contains print:hidden:', lbHtml.includes('print:hidden'));

  console.log('--- Print Fix Verification Complete ---');
}

testPrintEndpoints().catch(console.error);
