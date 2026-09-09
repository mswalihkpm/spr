import { hasPermission } from '@/lib/auth';
import { UserRole } from '@/types';

export function testRolePermissions() {
  const superAdminRole: UserRole = 'SUPER_ADMIN';
  const adminRole: UserRole = 'ADMIN';
  const creativeHubRole: UserRole = 'CREATIVE_HUB_ADMIN';
  const teacherRole: UserRole = 'TEACHER';
  const viewerRole: UserRole = 'VIEWER';

  // 1. Super Admin access
  console.assert(hasPermission(superAdminRole, 'SUPER_ADMIN') === true, 'SUPER_ADMIN can access SUPER_ADMIN');
  console.assert(hasPermission(superAdminRole, 'ADMIN') === true, 'SUPER_ADMIN can access ADMIN');
  console.assert(hasPermission(superAdminRole, 'CREATIVE_HUB_ADMIN') === true, 'SUPER_ADMIN can access CREATIVE_HUB_ADMIN');
  console.assert(hasPermission(superAdminRole, 'TEACHER') === true, 'SUPER_ADMIN can access TEACHER');
  console.assert(hasPermission(superAdminRole, 'VIEWER') === true, 'SUPER_ADMIN can access VIEWER');

  // 2. Creative Hub Admin access
  console.assert(hasPermission(creativeHubRole, 'SUPER_ADMIN') === false, 'CREATIVE_HUB_ADMIN CANNOT access SUPER_ADMIN');
  console.assert(hasPermission(creativeHubRole, 'ADMIN') === false, 'CREATIVE_HUB_ADMIN CANNOT access general ADMIN (students/weights/etc)');
  console.assert(hasPermission(creativeHubRole, 'TEACHER') === false, 'CREATIVE_HUB_ADMIN CANNOT access TEACHER');
  console.assert(hasPermission(creativeHubRole, 'CREATIVE_HUB_ADMIN') === true, 'CREATIVE_HUB_ADMIN CAN access CREATIVE_HUB_ADMIN');
  console.assert(hasPermission(creativeHubRole, 'VIEWER') === true, 'CREATIVE_HUB_ADMIN CAN access VIEWER');

  // 3. Admin access
  console.assert(hasPermission(adminRole, 'SUPER_ADMIN') === false, 'ADMIN CANNOT access SUPER_ADMIN');
  console.assert(hasPermission(adminRole, 'ADMIN') === true, 'ADMIN CAN access ADMIN');
  console.assert(hasPermission(adminRole, 'CREATIVE_HUB_ADMIN') === true, 'ADMIN CAN access CREATIVE_HUB_ADMIN');
  console.assert(hasPermission(adminRole, 'VIEWER') === true, 'ADMIN CAN access VIEWER');
}
