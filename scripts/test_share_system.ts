import {
  GOOGLE_PLAY_STORE_URL,
  ANDROID_PACKAGE_NAME,
  formatDossierShareText,
  formatNewsShareText,
  formatAchievementShareText,
  formatAppShareText,
} from '../src/lib/share-constants';
import { generateSharePayload, buildShareCardUrl } from '../src/lib/share-utils';

async function runTests() {
  console.log('================================================================');
  console.log('     SPR UNIFIED BRANDED SHARING SYSTEM COMPREHENSIVE TEST      ');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(name: string, condition: boolean, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${name}${detail ? ` (${detail})` : ''}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name}${detail ? ` (${detail})` : ''}`);
      failed++;
    }
  }

  // 1. Android Package & Play Store URL Verification
  assert(
    'Official Android Package Name',
    ANDROID_PACKAGE_NAME === 'in.madin.spr',
    ANDROID_PACKAGE_NAME
  );
  assert(
    'Official Google Play Store URL',
    GOOGLE_PLAY_STORE_URL === 'https://play.google.com/store/apps/details?id=in.madin.spr',
    GOOGLE_PLAY_STORE_URL
  );

  // 2. Template 1: Student Dossier Payload
  const dossierPayload = generateSharePayload({
    template: 'dossier',
    studentId: 'test-student-123',
    studentName: 'MUHAMMED SHAHINSHAH',
    className: 'Standard 10',
    division: 'B',
    sprId: 'MSOE-2026-088',
    rank: 4,
    overallScore: 89.45,
  });

  assert(
    'Dossier URL includes /student/id',
    dossierPayload.url.includes('/student/test-student-123'),
    dossierPayload.url
  );
  assert(
    'Dossier text includes Play Store URL',
    dossierPayload.text.includes(GOOGLE_PLAY_STORE_URL)
  );
  assert(
    'Dossier text includes Rank #4 and 89.45 pts',
    dossierPayload.text.includes('SPR Rank: #4') && dossierPayload.text.includes('89.45 pts')
  );
  assert(
    'Dossier text has zero private notes/passwords/emails',
    !dossierPayload.text.includes('password') &&
      !dossierPayload.text.includes('notes') &&
      !dossierPayload.text.includes('@madin.internal')
  );
  assert(
    'Dossier card URL points to /api/og/share?template=dossier',
    dossierPayload.imageUrl.includes('/api/og/share?template=dossier')
  );

  // 3. Template 2: News & Updates Payload
  const newsPayload = generateSharePayload({
    template: 'news',
    newsId: 'news-announcement-456',
    title: 'Grand Annual Festival Results Announced',
    subtitle: 'Celebrating holistic excellence across all academic wings',
    date: 'Nov 8, 2026',
  });

  assert(
    'News URL includes permalink /updates?id=news-announcement-456',
    newsPayload.url.includes('/updates?id=news-announcement-456'),
    newsPayload.url
  );
  assert(
    'News text includes Play Store URL',
    newsPayload.text.includes(GOOGLE_PLAY_STORE_URL)
  );
  assert(
    'News text includes headline and subtitle',
    newsPayload.text.includes('Grand Annual Festival Results Announced') &&
      newsPayload.text.includes('Celebrating holistic excellence')
  );

  // 4. Template 3: Achievement & Honors Payload
  const achievementPayload = generateSharePayload({
    template: 'achievement',
    studentName: 'FATIMA ZAHRA',
    achievementTitle: 'State Level Qur’an Recitation Champion',
    rankText: '1st Rank Champion',
    score: 98.5,
    category: 'Islamic Studies',
  });

  assert(
    'Achievement text includes Play Store URL',
    achievementPayload.text.includes(GOOGLE_PLAY_STORE_URL)
  );
  assert(
    'Achievement text includes 1st Rank Champion & score',
    achievementPayload.text.includes('Standing: 1st Rank Champion') &&
      achievementPayload.text.includes('98.50 SPR Points')
  );

  // 5. Template 4: General App Promo Payload
  const appPayload = generateSharePayload({
    template: 'app',
  });

  assert(
    'App promo text includes Google Play link',
    appPayload.text.includes(GOOGLE_PLAY_STORE_URL)
  );
  assert(
    'App promo text matches official tagline',
    appPayload.text.includes('Track academic progress, achievements, rankings and school activities')
  );
  assert(
    'App promo card filename is SPR-Platform-Madin-Excellence.png',
    appPayload.filename === 'SPR-Platform-Madin-Excellence.png'
  );

  console.log('\n================================================================');
  console.log(`  ALL SHARING TESTS COMPLETED: ${passed} PASSED, ${failed} FAILED  `);
  console.log('================================================================');

  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});

