// prisma/seed.ts
import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('[SEED] Starting seed...');

  // ─── CategoryGroups ──────────────────────────────────────────────────────
  // From FRD §F06a: seed-only in v1 (no admin UI for groups)
  const groups = await Promise.all([
    prisma.categoryGroup.upsert({
      where: { name: 'Streets & Transportation' },
      update: {},
      create: { name: 'Streets & Transportation', sort_order: 1 },
    }),
    prisma.categoryGroup.upsert({
      where: { name: 'Parks & Recreation' },
      update: {},
      create: { name: 'Parks & Recreation', sort_order: 2 },
    }),
    prisma.categoryGroup.upsert({
      where: { name: 'Utilities' },
      update: {},
      create: { name: 'Utilities', sort_order: 3 },
    }),
    prisma.categoryGroup.upsert({
      where: { name: 'Public Safety' },
      update: {},
      create: { name: 'Public Safety', sort_order: 4 },
    }),
    prisma.categoryGroup.upsert({
      where: { name: 'Other' },
      update: {},
      create: { name: 'Other', sort_order: 5 },
    }),
  ]);

  const [streets, parks, utilities, publicSafety] = groups;
  console.log(`[SEED] Created ${groups.length} CategoryGroups`);

  // ─── Departments ──────────────────────────────────────────────────────────
  const deptPublicWorks = await prisma.department.upsert({
    where: { name: 'Public Works' },
    update: {},
    create: { name: 'Public Works', active: true },
  });

  const deptParksRec = await prisma.department.upsert({
    where: { name: 'Parks & Recreation' },
    update: {},
    create: { name: 'Parks & Recreation', active: true },
  });

  const deptUtilities = await prisma.department.upsert({
    where: { name: 'Utilities' },
    update: {},
    create: { name: 'Utilities', active: true },
  });

  const deptPolice = await prisma.department.upsert({
    where: { name: 'Police Department' },
    update: {},
    create: { name: 'Police Department', active: true },
  });

  console.log('[SEED] Created 4 Departments');

  // ─── Sample Categories ────────────────────────────────────────────────────
  const categories = [
    {
      service_code: 'POTHOLE',
      name: 'Pothole',
      description: 'Road surface damage requiring repair',
      icon: 'alert-triangle',
      color: '#ef4444',
      group_id: streets.id,
      department_id: deptPublicWorks.id,
      anon_allowed: true,
    },
    {
      service_code: 'GRAFFITI',
      name: 'Graffiti',
      description: 'Unauthorized graffiti on public or private property',
      icon: 'spray-can',
      color: '#f97316',
      group_id: publicSafety.id,
      department_id: deptPolice.id,
      anon_allowed: true,
    },
    {
      service_code: 'SIDEWALK_DAMAGE',
      name: 'Sidewalk Damage',
      description: 'Cracked or damaged sidewalk creating a hazard',
      icon: 'footprints',
      color: '#eab308',
      group_id: streets.id,
      department_id: deptPublicWorks.id,
      anon_allowed: true,
    },
    {
      service_code: 'STREETLIGHT_OUT',
      name: 'Street Light Out',
      description: 'Street light not functioning',
      icon: 'lightbulb-off',
      color: '#6366f1',
      group_id: utilities.id,
      department_id: deptUtilities.id,
      anon_allowed: true,
    },
    {
      service_code: 'PARK_MAINTENANCE',
      name: 'Park Maintenance',
      description: 'Park grounds, equipment, or facilities need attention',
      icon: 'tree-pine',
      color: '#22c55e',
      group_id: parks.id,
      department_id: deptParksRec.id,
      anon_allowed: true,
    },
    {
      service_code: 'ILLEGAL_DUMPING',
      name: 'Illegal Dumping',
      description: 'Illegal trash or waste dumped on public property',
      icon: 'trash-2',
      color: '#8b5cf6',
      group_id: streets.id,
      department_id: deptPublicWorks.id,
      anon_allowed: true,
    },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { service_code: cat.service_code },
      update: {},
      create: { ...cat, active: true },
    });
  }

  console.log(`[SEED] Created ${categories.length} Categories`);

  // ─── Seed Users ───────────────────────────────────────────────────────────
  // DATA-04: At minimum one admin user and one staff user
  const adminPasswordHash = await bcrypt.hash('Admin1234!secure', 12);
  const staffPasswordHash  = await bcrypt.hash('Staff1234!secure', 12);

  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@bloomington.in.gov',
      password_hash: adminPasswordHash,
      role: UserRole.admin,
      active: true,
      department_id: null,
    },
  });

  const staffUser = await prisma.user.upsert({
    where: { username: 'staff' },
    update: {},
    create: {
      username: 'staff',
      email: 'staff@bloomington.in.gov',
      password_hash: staffPasswordHash,
      role: UserRole.staff,
      active: true,
      department_id: deptPublicWorks.id,
    },
  });

  console.log('[SEED] Created admin user:', adminUser.username, '(admin@bloomington.in.gov)');
  console.log('[SEED] Created staff user:', staffUser.username, '(staff@bloomington.in.gov)');
  console.log('[SEED] Seed complete.');
}

main()
  .catch((e) => {
    console.error('[SEED ERROR]', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
