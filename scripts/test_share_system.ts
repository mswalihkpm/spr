import fs from 'fs';
import {
  GOOGLE_PLAY_STORE_URL,
  ANDROID_PACKAGE_NAME,
  OFFICIAL_BANNER_PATH,
  formatDossierShareText,
  formatNewsShareText,
  formatAchievementShareText,
  formatAppShareText,
} from '../src/lib/share-constants';
import { generateSharePayload } from '../src/lib/share-utils';

async function runTests() {
  console.log('================================================================');
  console.log('   SPR WHATSAPP BRANDED SHARING SYSTEM COMPREHENSIVE TEST       ');
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

  // 1. Base Banner Image Existence and Path
  assert(
    'Official Banner Constant Path',
    OFFICIAL_BANNER_PATH === '/branding/spr-official-banner.jpg',
    OFFICIAL_BANNER_PATH
  );
  assert(
    'Base Banner File exists in public/branding',
    fs.existsSync('public/branding/spr-official-banner.jpg'),
    `Size: ${fs.statSync('public/branding/spr-official-banner.jpg').size} bytes`
  );
  assert(
    'Base Banner File exists in public root',
    fs.existsSync('public/spr-official-banner.jpg'),
    `Size: ${fs.statSync('public/spr-official-banner.jpg').size} bytes`
  );

  // 2. Official Play Store Link & Package
  assert(
    'Official Google Play Store Link',
    GOOGLE_PLAY_STORE_URL === 'https://play.google.com/store/apps/details?id=in.madin.spr',
    GOOGLE_PLAY_STORE_URL
  );
  assert(
    'Official Android Package Name',
    ANDROID_PACKAGE_NAME === 'in.madin.spr',
    ANDROID_PACKAGE_NAME
  );

  // 3. Template 1: Student Dossier
  const dossierPayload = generateSharePayload({
    template: 'dossier',
    studentId: 'test-student-123',
    studentName: 'ABDUL MAJID P',
    className: 'Standard 10',
    division: 'A',
    sprId: 'MSOE-2026-063',
    rank: 1,
    overallScore: 94.8,
  });

  assert(
    'Dossier uses base banner image for all sharing',
    dossierPayload.imageUrl.endsWith('/branding/spr-official-banner.jpg'),
    dossierPayload.imageUrl
  );
  assert(
    'Dossier text has clean WhatsApp bold formatting without emoji clutter',
    dossierPayload.text.includes('*Student:* ABDUL MAJID P') &&
      dossierPayload.text.includes('*Institutional Rank:* #1') &&
      dossierPayload.text.includes('*Overall SPR Score:* 94.80 pts') &&
      !dossierPayload.text.includes('🎓') &&
      !dossierPayload.text.includes('👤')
  );
  assert(
    'Dossier text includes Play Store link & direct dossier link',
    dossierPayload.text.includes(GOOGLE_PLAY_STORE_URL) &&
      dossierPayload.text.includes('/student/test-student-123')
  );

  // 4. Template 2: News & Updates
  const newsPayload = generateSharePayload({
    template: 'news',
    newsId: 'news-789',
    title: 'Grand Annual Festival Results Announced',
    subtitle: 'Celebrating holistic excellence',
    date: 'Nov 8, 2026',
  });

  assert(
    'News uses base banner image for all sharing',
    newsPayload.imageUrl.endsWith('/branding/spr-official-banner.jpg'),
    newsPayload.imageUrl
  );
  assert(
    'News text has WhatsApp formatting (*bold*, _italic_)',
    newsPayload.text.includes('*Grand Annual Festival Results Announced*') &&
      newsPayload.text.includes('_Celebrating holistic excellence_')
  );
  assert(
    'News text includes permalink /updates?id=news-789',
    newsPayload.text.includes('/updates?id=news-789')
  );

  // 5. Template 3: Share App
  const appPayload = generateSharePayload({
    template: 'app',
  });

  assert(
    'Share App uses base banner image',
    appPayload.imageUrl.endsWith('/branding/spr-official-banner.jpg'),
    appPayload.imageUrl
  );
  assert(
    'Share App ONLY shares the Google Play Store link',
    appPayload.text.includes(GOOGLE_PLAY_STORE_URL) &&
      appPayload.text.includes('*MA\'DIN SCHOOL OF EXCELLENCE*') &&
      !appPayload.text.includes('/student/') &&
      !appPayload.text.includes('/updates')
  );

  // 6. Leaderboard Verification: Zero Share Icons on Leaderboard
  const leaderboardContent = fs.readFileSync('src/app/leaderboard/page.tsx', 'utf8');
  assert(
    'Leaderboard page has NO handleSharePodium',
    !leaderboardContent.includes('handleSharePodium')
  );
  assert(
    'Leaderboard page has NO handleShareAchievement',
    !leaderboardContent.includes('handleShareAchievement')
  );
  assert(
    'Leaderboard page has NO Share2 import',
    !leaderboardContent.includes('Share2')
  );

  const homePageContent = fs.readFileSync('src/app/page.tsx', 'utf8');
  assert(
    'Home page leaderboard podium has NO handleSharePodium',
    !homePageContent.includes('handleSharePodium')
  );
  assert(
    'Home page leaderboard podium has NO Share2',
    !homePageContent.includes('Share2')
  );

  console.log('\n================================================================');
  console.log(`  ALL AUDIT CHECKS COMPLETED: ${passed} PASSED, ${failed} FAILED `);
  console.log('================================================================');

  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
