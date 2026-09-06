const http = require('http');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'madin_school_of_excellence_spr_super_secure_jwt_secret_key_2026';

async function testBulkUpload() {
  console.log('Testing bulk upload flow...');

  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  const islamicCat = await prisma.category.findFirst({ where: { code: 'ISLAMIC' } });
  const firstStudent = await prisma.student.findFirst();
  const superAdmin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });

  console.log('Islamic category:', islamicCat?.name, islamicCat?.id);
  console.log('First student:', firstStudent?.fullName, firstStudent?.id, firstStudent?.studentId);
  console.log('Super Admin:', superAdmin?.email, superAdmin?.id);

  const tokenPayload = {
    id: superAdmin.id,
    email: superAdmin.email,
    name: superAdmin.name,
    role: superAdmin.role,
    mustChangePassword: superAdmin.mustChangePassword,
  };
  const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });

  const payload = JSON.stringify({
    categoryId: islamicCat.id,
    examName: 'Annual Islamic Assessment',
    stream: 'JAMIATHUL_HIND',
    records: [
      {
        studentId: firstStudent.id,
        subjectScores: [
          { subjectName: 'Fiqh', obtainedScore: 88, maxScore: 100, remarks: 'Very Good' },
          { subjectName: 'Aqeedah', obtainedScore: 92, maxScore: 100, remarks: 'Excellent' }
        ],
        remarks: 'Great progress'
      }
    ]
  });

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/scores/bulk-upload',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `spr_auth_token=${token}`,
      'Content-Length': Buffer.byteLength(payload)
    }
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      console.log('HTTP Status:', res.statusCode);
      console.log('Response Body:', data);
      prisma.$disconnect();
    });
  });

  req.on('error', (e) => {
    console.error('Request error:', e);
    prisma.$disconnect();
  });

  req.write(payload);
  req.end();
}

testBulkUpload().catch(console.error);
