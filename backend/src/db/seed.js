import bcrypt from 'bcryptjs';
import Batch from '../models/Batch.js';
import Day from '../models/Day.js';
import Department from '../models/Department.js';
import Module from '../models/Module.js';
import Person from '../models/Person.js';
import Pod from '../models/Pod.js';
import Rotation from '../models/Rotation.js';
import Trainee from '../models/Trainee.js';

// Fictional dev seed data (trainee names/branches/phones) — not real trainee records.
// Modules and the rotation schedule are the real programme content from README.md /
// docs/app-prototype.html. Every seed step is independently idempotent so re-running
// after a partial migration (e.g. adding modules to an already-seeded batch) is safe.

const NAMES = ['Aditya Sharma', 'Rohit Yadav', 'Priyanshu Jain', 'Deepak Rathore',
  'Sandeep Kushwaha', 'Nikhil Tomar', 'Ankit Gupta', 'Shivam Dubey',
  'Ravi Parihar', 'Vishal Bhadauria', 'Manish Sen', 'Arjun Singh'];
const BRANCH = ['Civil — Govt Polytechnic Gwalior', 'Civil — MITS Polytechnic', 'Civil — Govt Polytechnic Morena',
  'Mechanical — Govt Polytechnic Gwalior', 'Civil — Govt Polytechnic Bhind', 'Civil — MITS Polytechnic',
  'Civil — Govt Polytechnic Gwalior', 'Electrical — Govt Polytechnic Gwalior', 'Civil — Govt Polytechnic Datia',
  'Civil — Govt Polytechnic Gwalior', 'Civil — Govt Polytechnic Shivpuri', 'Civil — MITS Polytechnic'];
// Only used the very first time seedBatchIfEmpty ever runs, to give the 4 pods a
// starting buddy — real buddies (created via the Users admin panel) replace these
// immediately in any deployment that's actually been used, so this never runs again
// once a batch exists. Deliberately NOT in the STAFF list below: an earlier version
// pre-created these via email-existence checks, which meant deleting a dummy buddy
// just let the next server restart silently recreate it — caught and fixed here.
const FRESH_DB_BUDDIES = [
  { name: 'S. Chauhan', email: 'schauhan@neev.local' },
  { name: 'M. Ahirwar', email: 'mahirwar@neev.local' },
  { name: 'P. Dixit', email: 'pdixit@neev.local' },
  { name: 'K. Raghuvanshi', email: 'kraghuvanshi@neev.local' },
];
const BASE = [34, 52, 61, 28, 45, 58, 39, 66, 31, 48, 55, 42];
// Fictional dev phone numbers, for testing OTP login only.
const PHONES = Array.from({ length: 12 }, (_, i) => `90000000${String(i + 1).padStart(2, '0')}`);

const DAYS = [
  ['D01', '2026-09-01', '1 Sep · Tue'], ['D02', '2026-09-02', '2 Sep · Wed'],
  ['D03', '2026-09-03', '3 Sep · Thu'], ['D04', '2026-09-04', '4 Sep · Fri'],
  ['D05', '2026-09-05', '5 Sep · Sat'], ['D06', '2026-09-07', '7 Sep · Mon'],
  ['D07', '2026-09-08', '8 Sep · Tue'], ['D08', '2026-09-09', '9 Sep · Wed'],
  ['D09', '2026-09-10', '10 Sep · Thu'], ['D10', '2026-09-11', '11 Sep · Fri'],
];

// The 22-module curriculum, from docs/app-prototype.html's MODS array (real content).
const MODULES = [
  ['M01', 'Site Safety & EHS', 'QC'], ['M02', 'Reading Drawings — architectural', 'MEA'],
  ['M03', 'Reading Drawings — structural & BBS', 'MEA'], ['M04', 'Measurement, IS 1200 & the MB', 'MEA'],
  ['M05', 'Land Survey & Setting Out', 'SUP'], ['M06', 'Levels & Levelling', 'SUP'],
  ['M07', 'Cement & Cement Testing', 'QC'], ['M08', 'Concrete & Concrete Testing', 'QC'],
  ['M09', 'Reinforcement Steel & BBS', 'SUP'], ['M10', 'Shuttering & Formwork', 'SUP'],
  ['M11', 'Brick, Block & Masonry Machinery', 'SUP'], ['M12', 'Plastering', 'SUP'],
  ['M13', 'Waterproofing', 'QC'], ['M14', 'Tiling & Flooring', 'SUP'],
  ['M15', 'Plumbing & Sanitary', 'SUP'], ['M16', 'Electrical', 'SUP'],
  ['M17', 'Stores & Inventory Management', 'STR'], ['M18', 'Estimation, BOQ & Rate Analysis', 'MEA'],
  ['M19', 'Quantity Surveying & Contractor Billing', 'MEA'], ['M20', 'QC — Checklists, NCR & Stop-Work Authority', 'QC'],
  ['M21', 'Site Documentation, DPR & Planning', 'STR'], ['M22', 'Labour, Contractor & Site Management', 'SUP'],
];

// Rotation schedule, from README.md — Month 1 taster blocks (Sept) and the Month 2-4
// immersion grid (Oct-Dec) + catch-up week. Every pod hosts every department once.
const TASTER = [
  ['B1', '2026-09-14', '2026-09-17', ['SUP', 'QC', 'MEA', 'STR']],
  ['B2', '2026-09-18', '2026-09-22', ['QC', 'MEA', 'STR', 'SUP']],
  ['B3', '2026-09-23', '2026-09-25', ['MEA', 'STR', 'SUP', 'QC']],
  ['B4', '2026-09-26', '2026-09-29', ['STR', 'SUP', 'QC', 'MEA']],
];
const IMMERSION = [
  ['Month 2', '2026-10-01', '2026-10-31', ['SUP', 'QC', 'MEA', 'STR']],
  ['Month 3', '2026-11-01', '2026-11-30', ['QC', 'MEA', 'STR', 'SUP']],
  ['Month 4', '2026-12-01', '2026-12-24', ['MEA', 'STR', 'SUP', 'QC']],
  ['Catch-up week', '2026-12-25', '2026-12-31', ['STR', 'SUP', 'QC', 'MEA']],
];

// The one real account seeded on boot — everything else (Deepti/Rajat/Bharti/buddies
// below) is still placeholder dev data. Log in with this, then use the Users admin
// panel to create real accounts with real passwords for everyone else. The password
// comes from an env var (never committed) — same pattern as JWT_SECRET/MONGO_URL.
const ADMIN_EMAIL = 'shipra@neotericgrp.in';

// Checks "does ANY admin exist" — not "does this exact email exist" — so deleting
// this bootstrap account (once a different real admin exists, or on purpose) stays
// deleted. Checking by the specific email was the same bug that kept resurrecting
// the dummy buddies below: freeing up the email just invited the next restart to
// recreate it.
async function seedAdminIfMissing() {
  if (await Person.countDocuments({ role: 'admin' })) return;
  if (!process.env.ADMIN_SEED_PASSWORD) {
    console.warn('ADMIN_SEED_PASSWORD is not set — skipping initial admin seed');
    return;
  }
  const passwordHash = await bcrypt.hash(process.env.ADMIN_SEED_PASSWORD, 10);
  await Person.create({ name: 'Shipra', email: ADMIN_EMAIL, role: 'admin', passwordHash });
  console.log(`Seeded real admin login: ${ADMIN_EMAIL} — change this password after first login`);
}

// Dev-only staff logins — SPEC.md §1 wants real email+password for staff. There's now
// a real Users admin panel to create/reset accounts, so this only matters for local
// dev — rotate or delete these before anything resembling real use.
const STAFF = [
  { name: 'Deepti', email: 'deepti@neev.local', role: 'supervisor', password: 'neev2026' },
  { name: 'Rajat', email: 'rajat@neev.local', role: 'coordinator', password: 'neev2026' },
  { name: 'Bharti', email: 'bharti@neev.local', role: 'office', password: 'neev2026' },
];

// Same fix as the admin/buddy seeds above: gated on "has this role ever been seeded
// at all", not per-email. Deleting Deepti's dev account (replaced with a real
// deepti@neotericgrp.in one, say) must not bring deepti@neev.local back on the next
// restart just because that specific email is free again.
async function seedStaffIfMissing() {
  const roles = STAFF.map((s) => s.role);
  if (await Person.countDocuments({ role: { $in: roles } })) return;
  for (const s of STAFF) {
    const passwordHash = await bcrypt.hash(s.password, 10);
    await Person.create({ name: s.name, email: s.email, role: s.role, passwordHash });
  }
  console.log(`Dev staff logins (rotate before real use): ${STAFF.map((s) => `${s.email} / ${s.password}`).join(', ')}`);
}

async function seedBatchIfEmpty() {
  if (await Batch.countDocuments()) return;

  const batch = await Batch.create({ slug: 'b1', name: '2026-01', startDate: new Date('2026-09-01'), status: 'active' });

  const buddyPasswordHash = await bcrypt.hash('neev2026', 10);
  const buddyPersons = await Person.insertMany(
    FRESH_DB_BUDDIES.map((b) => ({ name: b.name, email: b.email, role: 'buddy', passwordHash: buddyPasswordHash })));

  const pods = await Pod.insertMany(
    buddyPersons.map((buddy, i) => ({ batch: batch._id, name: `Pod ${i + 1}`, buddy: buddy._id })));

  const traineePersons = await Person.insertMany(
    NAMES.map((name, i) => ({ name, role: 'trainee', phone: PHONES[i] })));

  await Trainee.insertMany(NAMES.map((_, i) => ({
    code: 'T' + String(i + 1).padStart(2, '0'),
    person: traineePersons[i]._id,
    batch: batch._id,
    pod: pods[i % 4]._id,
    buddy: buddyPersons[i % 4]._id,
    branch: BRANCH[i],
    baselineScore: BASE[i],
    status: 'active',
  })));

  await Day.insertMany(DAYS.map(([code, date, label]) => ({
    batch: batch._id, code, date: new Date(date), label,
  })));

  console.log(`Dev trainee OTP logins (rotate before real use): phone ${PHONES[0]}..${PHONES.at(-1)}, code printed on request`);
  console.log('Seeded dev data: 1 batch, 4 pods, 12 trainees, 10 days');
}

// The program's starting department list — Civil-trade specific (README.md), but
// now just data: admins can rename/add/remove departments afterward (routes/
// departments.js) without touching code, e.g. to run a different trade's program.
const DEFAULT_DEPARTMENTS = [
  ['SUP', 'Supervision'], ['QC', 'Quality'], ['MEA', 'Measurement'], ['STR', 'Store'],
];

async function seedDepartmentsIfEmpty() {
  if (await Department.countDocuments()) return;
  await Department.insertMany(DEFAULT_DEPARTMENTS.map(([code, name]) => ({ code, name })));
  console.log(`Seeded ${DEFAULT_DEPARTMENTS.length} departments`);
}

async function seedModulesIfEmpty() {
  if (await Module.countDocuments()) return;
  await Module.insertMany(MODULES.map(([code, title, department], i) => ({
    code, title, department, sequence: i + 1,
  })));
  console.log(`Seeded ${MODULES.length} modules`);
}

async function seedRotationIfEmpty() {
  if (await Rotation.countDocuments()) return;
  const pods = await Pod.find().sort('name').lean();
  if (pods.length !== 4) return; // batch not seeded yet — nothing to attach rotation to

  const rows = [];
  for (const [blockCode, startsOn, endsOn, depts] of [...TASTER, ...IMMERSION]) {
    pods.forEach((pod, i) => {
      rows.push({ pod: pod._id, blockCode, department: depts[i], startsOn: new Date(startsOn), endsOn: new Date(endsOn) });
    });
  }
  await Rotation.insertMany(rows);
  console.log(`Seeded rotation schedule: ${rows.length} pod-blocks`);
}

export async function seedIfEmpty() {
  await seedAdminIfMissing();
  await seedStaffIfMissing();
  await seedBatchIfEmpty();
  await seedDepartmentsIfEmpty();
  await seedModulesIfEmpty();
  await seedRotationIfEmpty();
}

// Exported for routes that need the single seeded batch until multi-batch support exists.
export async function getDefaultBatch() {
  return Batch.findOne();
}
