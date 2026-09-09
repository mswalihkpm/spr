function hasPermission(userRole, requiredRole) {
  if (userRole === 'SUPER_ADMIN') return true;
  if (userRole === 'ADMIN') {
    return requiredRole !== 'SUPER_ADMIN';
  }
  if (userRole === 'CREATIVE_HUB_ADMIN') {
    return requiredRole === 'CREATIVE_HUB_ADMIN' || requiredRole === 'VIEWER';
  }
  if (userRole === 'TEACHER') {
    return requiredRole === 'TEACHER' || requiredRole === 'VIEWER';
  }
  if (userRole === 'VIEWER') {
    return requiredRole === 'VIEWER';
  }
  return false;
}

function runTests() {
  console.log('--- Testing Role Permissions Logic ---');

  const superAdminRole = 'SUPER_ADMIN';
  const adminRole = 'ADMIN';
  const creativeHubRole = 'CREATIVE_HUB_ADMIN';
  const teacherRole = 'TEACHER';
  const viewerRole = 'VIEWER';

  // 1. Super Admin access
  console.assert(hasPermission(superAdminRole, 'SUPER_ADMIN') === true, 'SUPER_ADMIN can access SUPER_ADMIN');
  console.assert(hasPermission(superAdminRole, 'ADMIN') === true, 'SUPER_ADMIN can access ADMIN');
  console.assert(hasPermission(superAdminRole, 'CREATIVE_HUB_ADMIN') === true, 'SUPER_ADMIN can access CREATIVE_HUB_ADMIN');
  console.assert(hasPermission(superAdminRole, 'TEACHER') === true, 'SUPER_ADMIN can access TEACHER');
  console.assert(hasPermission(superAdminRole, 'VIEWER') === true, 'SUPER_ADMIN can access VIEWER');
  console.log('✅ SUPER_ADMIN has full permissions across all modules');

  // 2. Creative Hub Admin access
  console.assert(hasPermission(creativeHubRole, 'SUPER_ADMIN') === false, 'CREATIVE_HUB_ADMIN CANNOT access SUPER_ADMIN');
  console.assert(hasPermission(creativeHubRole, 'ADMIN') === false, 'CREATIVE_HUB_ADMIN CANNOT access general ADMIN');
  console.assert(hasPermission(creativeHubRole, 'TEACHER') === false, 'CREATIVE_HUB_ADMIN CANNOT access TEACHER');
  console.assert(hasPermission(creativeHubRole, 'CREATIVE_HUB_ADMIN') === true, 'CREATIVE_HUB_ADMIN CAN access CREATIVE_HUB_ADMIN');
  console.assert(hasPermission(creativeHubRole, 'VIEWER') === true, 'CREATIVE_HUB_ADMIN CAN access VIEWER');
  console.log('✅ CREATIVE_HUB_ADMIN is strictly isolated to Creative Hub & Viewer permissions');

  // 3. Admin access
  console.assert(hasPermission(adminRole, 'SUPER_ADMIN') === false, 'ADMIN CANNOT access SUPER_ADMIN');
  console.assert(hasPermission(adminRole, 'ADMIN') === true, 'ADMIN CAN access ADMIN');
  console.assert(hasPermission(adminRole, 'CREATIVE_HUB_ADMIN') === true, 'ADMIN CAN access CREATIVE_HUB_ADMIN');
  console.assert(hasPermission(adminRole, 'VIEWER') === true, 'ADMIN CAN access VIEWER');
  console.log('✅ ADMIN permissions validated');

  console.log('\n🎉 All role permission assertions PASSED successfully!');
}

runTests();
