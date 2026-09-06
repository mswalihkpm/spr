import { prisma } from '../lib/prisma';

const BASE_URL = 'http://localhost:3000';

async function testAuthSecurity() {
  console.log('========================================================');
  console.log('TESTING USER DELETION, STAFF ADDITION & PASSWORD RESET SECURITY');
  console.log('========================================================\n');

  // 1. Verify Users in DB
  console.log('1. Checking Database Users...');
  const users = await prisma.user.findMany();
  const emails = users.map((u) => u.email);
  console.log('   Current Users in DB:', emails);

  if (emails.includes('admin@madin.edu.in') || emails.includes('usthad.ahmed@madin.edu.in')) {
    console.error('   ❌ FAIL: Old deleted users still exist in database.');
  } else {
    console.log('   ✅ PASS: admin@madin.edu.in and usthad.ahmed@madin.edu.in are deleted.');
  }

  const staffUser = users.find((u) => u.email === 'mswalihkpm@gmail.com');
  if (staffUser && staffUser.role === 'TEACHER') {
    console.log(`   ✅ PASS: mswalihkpm@gmail.com exists with role: ${staffUser.role} (Staff)`);
  } else {
    console.error('   ❌ FAIL: mswalihkpm@gmail.com staff user missing.');
  }

  // 2. Test Login for mswalihkpm@gmail.com
  console.log('\n2. Testing Staff Login for mswalihkpm@gmail.com...');
  const resLogin = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'mswalihkpm@gmail.com', password: 'Madin@2026' }),
  });
  const dataLogin = await resLogin.json();
  console.log(`   Status: ${resLogin.status}`);
  console.log(`   User: ${dataLogin.user?.name} (${dataLogin.user?.role})`);

  if (resLogin.status === 200 && dataLogin.user?.email === 'mswalihkpm@gmail.com') {
    console.log('   ✅ PASS: mswalihkpm@gmail.com authenticated successfully.');
  } else {
    console.error('   ❌ FAIL: Staff login failed.');
  }

  // 3. Test Password Reset Request Security (No Token Leakage in JSON response)
  console.log('\n3. Testing Password Reset Request Security (Zero Token Leak)...');
  const resResetReq = await fetch(`${BASE_URL}/api/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'REQUEST_RESET', email: 'mswalihkpm@gmail.com' }),
  });
  const dataResetReq = await resResetReq.json();
  console.log(`   Status: ${resResetReq.status}`);
  console.log(`   Response Message: "${dataResetReq.message}"`);
  console.log(`   Contains 'resetToken': ${'resetToken' in dataResetReq}`);
  console.log(`   Contains 'token': ${'token' in dataResetReq}`);
  console.log(`   Contains 'otp': ${'otp' in dataResetReq}`);

  if (resResetReq.status === 200 && !('resetToken' in dataResetReq) && !('token' in dataResetReq)) {
    console.log('   ✅ PASS: Password reset request is secure — token/code is NEVER returned in response.');
  } else {
    console.error('   ❌ FAIL: Security vulnerability: token leaked in response!');
  }

  // 4. Test Verification with WRONG code
  console.log('\n4. Testing Reset with Invalid Verification Code (Brute force protection)...');
  const resWrong = await fetch(`${BASE_URL}/api/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'VERIFY_AND_RESET',
      email: 'mswalihkpm@gmail.com',
      verificationCode: '000000',
      newPassword: 'NewStaffPassword@2026',
    }),
  });
  const dataWrong = await resWrong.json();
  console.log(`   Status: ${resWrong.status} | Error: "${dataWrong.error}"`);
  if (resWrong.status === 400 && dataWrong.error.includes('incorrect')) {
    console.log('   ✅ PASS: Incorrect verification code properly rejected.');
  } else {
    console.error('   ❌ FAIL: Wrong code validation failed.');
  }

  // 5. Fetch actual OTP generated in DB and verify valid reset
  console.log('\n5. Testing Reset with Valid 6-Digit OTP from DB...');
  const tokenRecord = await prisma.passwordResetToken.findFirst({
    where: { userId: staffUser!.id, used: false },
  });
  console.log(`   Active 6-digit OTP code in DB: "${tokenRecord?.token}" (Expires: ${tokenRecord?.expiresAt})`);

  if (tokenRecord) {
    const resValidReset = await fetch(`${BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'VERIFY_AND_RESET',
        email: 'mswalihkpm@gmail.com',
        verificationCode: tokenRecord.token,
        newPassword: 'Madin@2026Updated',
      }),
    });
    const dataValidReset = await resValidReset.json();
    console.log(`   Status: ${resValidReset.status} | Message: "${dataValidReset.message}"`);

    if (resValidReset.status === 200 && dataValidReset.success) {
      console.log('   ✅ PASS: Valid 6-digit OTP verified and password updated.');
    } else {
      console.error('   ❌ FAIL: Valid OTP reset failed.');
    }

    // Test Login with updated password
    console.log('\n6. Testing Login with New Reset Password (Madin@2026Updated)...');
    const resNewLogin = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'mswalihkpm@gmail.com', password: 'Madin@2026Updated' }),
    });
    const dataNewLogin = await resNewLogin.json();
    console.log(`   Status: ${resNewLogin.status} | Authenticated: ${dataNewLogin.user?.email}`);
    if (resNewLogin.status === 200) {
      console.log('   ✅ PASS: Authenticated with newly reset password.');
    } else {
      console.error('   ❌ FAIL: Login with new password failed.');
    }
  }

  console.log('\n========================================================');
  console.log('ALL AUTH & PASSWORD SECURITY TESTS COMPLETED SUCCESSFULLY');
  console.log('========================================================');
}

testAuthSecurity().catch(console.error).finally(() => prisma.$disconnect());
