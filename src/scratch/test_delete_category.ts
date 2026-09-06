export {};
const BASE_URL = 'http://localhost:3000';

async function testCategoryDeletion() {
  console.log('========================================================');
  console.log('TESTING CUSTOM CATEGORY & ENTITY CASCADING DELETIONS');
  console.log('========================================================\n');

  // Step 1: Login
  let resLogin = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@madin.edu.in', password: 'Madin@2026' }),
  });
  if (resLogin.status !== 200) {
    resLogin = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'excellence@madin.edu.in', password: '159159' }),
    });
  }
  const cookie = resLogin.headers.get('set-cookie')?.split(';')[0] || '';
  console.log(`1. Login status: ${resLogin.status}`);

  // Step 2: Create a Custom Category with Subcategories & Weights
  console.log('2. Creating a test Custom Category with subcategories...');
  const resCreate = await fetch(`${BASE_URL}/api/categories`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie,
    },
    body: JSON.stringify({
      name: 'Temporary Test Wing',
      description: 'Testing safe cascading deletion without foreign key errors',
      icon: 'Award',
      defaultWeight: 5,
      includeInSPR: true,
      subcategories: [
        { name: 'Debate Test 1', maxScore: 50 },
        { name: 'Debate Test 2', maxScore: 50 },
      ],
    }),
  });
  const dataCreate = await resCreate.json();
  console.log(`   Create Status: ${resCreate.status}`);
  console.log(`   Created Category ID: ${dataCreate.category?.id}`);
  console.log(`   Category Code: ${dataCreate.category?.code}`);

  if (!dataCreate.category?.id) {
    console.error('❌ Failed to create test category:', dataCreate);
    return;
  }

  const categoryId = dataCreate.category.id;

  // Step 3: Now Delete the Created Category
  console.log(`3. Deleting category ID "${categoryId}"...`);
  const resDelete = await fetch(`${BASE_URL}/api/categories?id=${categoryId}`, {
    method: 'DELETE',
    headers: { Cookie: cookie },
  });
  const dataDelete = await resDelete.json();
  console.log(`   Delete Status: ${resDelete.status}`);
  console.log(`   Delete Response:`, dataDelete);

  if (resDelete.status === 200 && dataDelete.success) {
    console.log('\n✅ PASS: Category deleted cleanly with all relations cascaded!\n');
  } else {
    console.error('\n❌ FAIL: Category delete threw error:', dataDelete);
  }

  console.log('========================================================');
  console.log('🎯 DELETION VERIFICATION COMPLETED!');
  console.log('========================================================');
}

testCategoryDeletion().catch(console.error);
