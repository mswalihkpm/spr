import { NextRequest } from 'next/server';
import { GET as getShareImage } from '../src/app/api/og/share/route';
import { prisma } from '../src/lib/prisma';
import fs from 'fs';
import path from 'path';

async function testAllTemplates() {
  console.log('Testing all 4 sharing templates in src/app/api/og/share/route.ts...\n');

  const previewDir = path.resolve('public/branding/generated-previews');
  if (!fs.existsSync(previewDir)) fs.mkdirSync(previewDir, { recursive: true });

  // 1. Template: Dossier
  const student = await prisma.student.findFirst({
    where: { status: 'ACTIVE' },
    select: { id: true, studentId: true, fullName: true },
  });
  const studentId = student?.studentId || 'MSOE-2026-001';

  console.log(`1. Generating Student Dossier Card for ${student?.fullName} (${studentId})...`);
  const reqDossier = new NextRequest(`http://localhost:3000/api/og/share?template=dossier&id=${studentId}`);
  const resDossier = await getShareImage(reqDossier);
  if (!resDossier.ok) throw new Error(`Dossier template failed: ${resDossier.status}`);
  const bufDossier = Buffer.from(await resDossier.arrayBuffer());
  const dossierPath = path.join(previewDir, 'template-1-dossier.png');
  fs.writeFileSync(dossierPath, bufDossier);
  console.log(`   [PASS] Saved: ${dossierPath} (${(bufDossier.length / 1024).toFixed(1)} KB)\n`);

  // 2. Template: News & Updates
  const news = await prisma.news.findFirst({
    orderBy: { createdAt: 'desc' },
  });
  const newsId = news?.id || '';
  console.log(`2. Generating News & Updates Card for: "${news?.title || 'Announcement'}"...`);
  const reqNews = new NextRequest(`http://localhost:3000/api/og/share?template=news&id=${newsId}`);
  const resNews = await getShareImage(reqNews);
  if (!resNews.ok) throw new Error(`News template failed: ${resNews.status}`);
  const bufNews = Buffer.from(await resNews.arrayBuffer());
  const newsPath = path.join(previewDir, 'template-2-news.png');
  fs.writeFileSync(newsPath, bufNews);
  console.log(`   [PASS] Saved: ${newsPath} (${(bufNews.length / 1024).toFixed(1)} KB)\n`);

  // 3. Template: Achievements & Honors
  console.log('3. Generating Achievements & Honors Card for Champion...');
  const reqAchievement = new NextRequest(
    'http://localhost:3000/api/og/share?template=achievement&name=MUHAMMED+LUQMAN+V&title=Overall+SPR+Champion&rank=1&score=521.51&category=All+Wings'
  );
  const resAchievement = await getShareImage(reqAchievement);
  if (!resAchievement.ok) throw new Error(`Achievement template failed: ${resAchievement.status}`);
  const bufAchievement = Buffer.from(await resAchievement.arrayBuffer());
  const achievementPath = path.join(previewDir, 'template-3-achievement.png');
  fs.writeFileSync(achievementPath, bufAchievement);
  console.log(`   [PASS] Saved: ${achievementPath} (${(bufAchievement.length / 1024).toFixed(1)} KB)\n`);

  // 4. Template: General App Promotion
  console.log('4. Generating General App Promotion Card...');
  const reqApp = new NextRequest('http://localhost:3000/api/og/share?template=app');
  const resApp = await getShareImage(reqApp);
  if (!resApp.ok) throw new Error(`App template failed: ${resApp.status}`);
  const bufApp = Buffer.from(await resApp.arrayBuffer());
  const appPath = path.join(previewDir, 'template-4-app.png');
  fs.writeFileSync(appPath, bufApp);
  console.log(`   [PASS] Saved: ${appPath} (${(bufApp.length / 1024).toFixed(1)} KB)\n`);

  console.log('================================================================');
  console.log('  ALL 4 SHARING TEMPLATES GENERATED AND VALIDATED SUCCESSFULLY!  ');
  console.log('================================================================');
}

testAllTemplates().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
}).then(() => process.exit(0));

