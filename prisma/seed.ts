// prisma/seed.ts
import { PrismaClient, UserRole, TicketStatus } from '@prisma/client';
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

  // ─── Demo Sample Tickets ────────────────────────────────────────────────
  // Seeded ONLY on an empty ticket table, so a fresh environment (a new preview
  // sandbox, a clean dev DB) comes up with realistic data instead of an empty
  // staff queue / Reports dashboard / map. Idempotent (guarded on ticket count);
  // set SEED_DEMO_TICKETS=false to skip. Users + reference data above still seed
  // regardless — this block only adds sample activity.
  const existingTickets = await prisma.ticket.count();
  if (existingTickets === 0 && process.env.SEED_DEMO_TICKETS !== 'false') {
    const allCategories = await prisma.category.findMany();
    const DAY_MS = 86_400_000;
    const now = Date.now();
    const BLOOMINGTON = { lat: 39.1653, lng: -86.5264 };
    const STREETS = [
      'S Walnut St', 'E Kirkwood Ave', 'N College Ave', 'W 3rd St', 'S Rogers St',
      'E Atwater Ave', 'N Dunn St', 'W Bloomfield Rd', 'S Henderson St', 'E 10th St',
      'N Morton St', 'W Kirkwood Ave',
    ];
    const DESCRIPTIONS: Record<string, string[]> = {
      POTHOLE: ['Deep pothole damaging tires', 'Large pothole after the rain', 'Sunken patch in the travel lane'],
      GRAFFITI: ['Graffiti on the underpass wall', 'Tagging on a park bench', 'Spray paint on the transit shelter'],
      SIDEWALK_DAMAGE: ['Cracked slab, trip hazard', 'Sidewalk uplifted by tree roots', 'Broken curb ramp at the corner'],
      STREETLIGHT_OUT: ['Street light out all week', 'Flickering lamp at the intersection', 'Dark stretch near the school'],
      PARK_MAINTENANCE: ['Overflowing trash bins', 'Broken swing at the playground', 'Tall grass in the picnic area'],
      ILLEGAL_DUMPING: ['Mattress dumped in the alley', 'Bags of trash left by the trail', 'Old tires curbside'],
    };
    const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
    const jitter = (v: number): number => v + (Math.random() - 0.5) * 0.05;

    const DEMO_COUNT = 18;
    for (let i = 0; i < DEMO_COUNT; i++) {
      const category = pick(allCategories);
      const roll = Math.random();
      const status = roll < 0.4 ? TicketStatus.open : roll < 0.66 ? TicketStatus.in_progress : TicketStatus.closed;
      const createdMs = now - (Math.floor(Math.random() * 29) + 1) * DAY_MS - Math.floor(Math.random() * DAY_MS);
      const updatedMs = status === TicketStatus.open
        ? createdMs
        : Math.min(now - Math.floor(Math.random() * DAY_MS), createdMs + (Math.floor(Math.random() * 7) + 1) * DAY_MS);

      const ticket = await prisma.ticket.create({
        data: {
          service_code: category.service_code,
          description: pick(DESCRIPTIONS[category.service_code] ?? ['Reported issue']),
          address: `${100 + Math.floor(Math.random() * 900)} ${pick(STREETS)}, Bloomington, IN 47401`,
          lat: jitter(BLOOMINGTON.lat),
          lng: jitter(BLOOMINGTON.lng),
          status,
          category_id: category.id,
          department_id: category.department_id,
          assignee_id: status === TicketStatus.open ? null : staffUser.id,
        },
      });

      // Backdate timestamps so the time-series + resolution-time reports have a
      // spread. Raw SQL because updated_at is @updatedAt (Prisma sets it to now()
      // on create and ignores an override).
      await prisma.$executeRawUnsafe(
        'UPDATE "Ticket" SET created_at = $1, updated_at = $2 WHERE id = $3',
        new Date(createdMs), new Date(updatedMs), ticket.id,
      );

      if (status !== TicketStatus.open) {
        await prisma.ticketHistory.create({
          data: {
            ticket_id: ticket.id,
            actor_id: staffUser.id,
            action: 'STATUS_CHANGE',
            from_value: 'open',
            to_value: String(status),
          },
        });
      }
    }
    console.log(`[SEED] Created ${DEMO_COUNT} demo sample tickets.`);
  } else {
    console.log(`[SEED] Demo tickets skipped (existing=${existingTickets}, SEED_DEMO_TICKETS=${process.env.SEED_DEMO_TICKETS ?? 'unset'}).`);
  }

  console.log('[SEED] Seed complete.');
}

main()
  .catch((e) => {
    console.error('[SEED ERROR]', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
