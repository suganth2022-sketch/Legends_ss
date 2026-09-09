import { PrismaClient, MemberStatus, KycStatus } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Legends MLM Database...');

  // 1. Seed Roles
  const superAdminRole = await prisma.role.upsert({
    where: { name: 'Super Admin' },
    update: {},
    create: {
      name: 'Super Admin',
      description: 'Full system access and security administration',
    },
  });

  const financeRole = await prisma.role.upsert({
    where: { name: 'Finance Admin' },
    update: {},
    create: {
      name: 'Finance Admin',
      description: 'Payout processing, manual payment entry, tax reports',
    },
  });

  const supportRole = await prisma.role.upsert({
    where: { name: 'Support Admin' },
    update: {},
    create: {
      name: 'Support Admin',
      description: 'Member support, genealogy view, notification sending',
    },
  });

  // 2. Seed Default Commission Rules (Business Rules v1.1 — see docs/business-rules.md)
  // Level 1 = the paying member (self) — never a ledger row, always 0%.
  // Level 2 = direct sponsor, Level 3 = sponsor's sponsor, ... Level 10 = 9th-line upline.
  const defaultCommissionRates = [
    { level: 2, percentage: 10.0 }, // Level 2 (Direct Sponsor): 10%
    { level: 3, percentage: 6.6 }, // Level 3: 6.6%
    { level: 4, percentage: 3.3 }, // Level 4: 3.3%
    { level: 5, percentage: 2.3 }, // Level 5: 2.3%
    { level: 6, percentage: 2.3 }, // Level 6: 2.3%
    { level: 7, percentage: 2.0 }, // Level 7: 2%
    { level: 8, percentage: 2.0 }, // Level 8: 2%
    { level: 9, percentage: 1.6 }, // Level 9: 1.6%
    { level: 10, percentage: 1.3 }, // Level 10: 1.3%
  ];

  for (const rule of defaultCommissionRates) {
    const existingRule = await prisma.commissionRule.findFirst({
      where: { level: rule.level, effectiveTo: null },
    });

    if (!existingRule) {
      await prisma.commissionRule.create({
        data: {
          level: rule.level,
          percentage: rule.percentage,
          effectiveFrom: new Date('2026-01-01'),
        },
      });
    }
  }

  // 3. Seed Root Admin User
  const adminPasswordHash = await argon2.hash('AdminPassword2026!');
  const adminUser = await prisma.adminUser.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@legends-mlm.com',
      fullName: 'Legends Super Administrator',
      passwordHash: adminPasswordHash,
      roleId: superAdminRole.id,
    },
  });

  // 4. Seed member_code counter (root A000001 = 1; next registration -> A000002)
  await prisma.systemCounter.upsert({
    where: { key: 'member_code' },
    update: {},
    create: { key: 'member_code', value: 1 },
  });

  // 5. Seed Root Corporate Member (A000001)
  const memberPasswordHash = await argon2.hash('MemberPassword2026!');
  const rootMember = await prisma.member.upsert({
    where: { memberCode: 'A000001' },
    update: {},
    create: {
      memberCode: 'A000001',
      fullName: 'Legends Corporate Root',
      email: 'root@legends-mlm.com',
      phone: '+919999999999',
      passwordHash: memberPasswordHash,
      status: MemberStatus.ACTIVE,
      doj: new Date('2026-01-01'),
      profile: {
        create: {
          city: 'Hyderabad',
          state: 'Telangana',
          pincode: '500001',
        },
      },
      kyc: {
        create: {
          status: KycStatus.VERIFIED,
          verifiedAt: new Date(),
        },
      },
      paymentPlans: {
        create: {
          committedAmount: 2000,
          effectiveFrom: new Date('2026-01-01'),
        },
      },
    },
  });

  console.log('✅ Seeding completed successfully!');
  console.log(`  - Root Member: ${rootMember.memberCode} (${rootMember.fullName})`);
  console.log(`  - Admin User: ${adminUser.username} (${adminUser.email})`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
