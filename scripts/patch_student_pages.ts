import * as fs from 'fs';
import * as path from 'path';

// 1. Patch src/app/student/[id]/page.tsx
const studentPagePath = path.resolve(process.cwd(), 'src/app/student/[id]/page.tsx');
let studentPageContent = fs.readFileSync(studentPagePath, 'utf8');

if (!studentPageContent.includes("import { fetchWithDedupe } from '@/lib/client-cache';")) {
  studentPageContent = studentPageContent.replace(
    "import MobileHeaderMenu from '@/components/layout/MobileHeaderMenu';",
    "import MobileHeaderMenu from '@/components/layout/MobileHeaderMenu';\r\nimport { fetchWithDedupe } from '@/lib/client-cache';"
  );
}

studentPageContent = studentPageContent.replace(
  `    fetch(\`/api/public/student/\${studentId}\`)\r\n      .then((res) => res.json())`,
  `    fetchWithDedupe<any>(\`/api/public/student/\${studentId}\`)`
);

fs.writeFileSync(studentPagePath, studentPageContent, 'utf8');
console.log('Patched src/app/student/[id]/page.tsx');

// 2. Patch src/app/leaderboard/page.tsx
const leaderboardPath = path.resolve(process.cwd(), 'src/app/leaderboard/page.tsx');
let lbContent = fs.readFileSync(leaderboardPath, 'utf8');

if (!lbContent.includes("import { fetchWithDedupe } from '@/lib/client-cache';")) {
  lbContent = lbContent.replace(
    "import MobileHeaderMenu from '@/components/layout/MobileHeaderMenu';",
    "import MobileHeaderMenu from '@/components/layout/MobileHeaderMenu';\r\nimport { fetchWithDedupe } from '@/lib/client-cache';"
  );
}

lbContent = lbContent.replace(
  `    fetch(\`/api/public/student/\${studentId}\`)\r\n      .then((res) => res.json())`,
  `    fetchWithDedupe<any>(\`/api/public/student/\${studentId}\`)`
);

fs.writeFileSync(leaderboardPath, lbContent, 'utf8');
console.log('Patched src/app/leaderboard/page.tsx');

// 3. Patch src/app/page.tsx
const homePath = path.resolve(process.cwd(), 'src/app/page.tsx');
let homeContent = fs.readFileSync(homePath, 'utf8');

if (!homeContent.includes("import { fetchWithDedupe } from '@/lib/client-cache';")) {
  homeContent = homeContent.replace(
    "import MobileHeaderMenu from '@/components/layout/MobileHeaderMenu';",
    "import MobileHeaderMenu from '@/components/layout/MobileHeaderMenu';\r\nimport { fetchWithDedupe } from '@/lib/client-cache';"
  );
}

homeContent = homeContent.replace(
  `    fetch(\`/api/public/student/\${studentId}\`)\r\n      .then((res) => res.json())`,
  `    fetchWithDedupe<any>(\`/api/public/student/\${studentId}\`)`
);

fs.writeFileSync(homePath, homeContent, 'utf8');
console.log('Patched src/app/page.tsx');

