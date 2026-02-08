/**
 * Prisma Seed 스크립트
 * 테스트 데이터 생성: 요금제, 조직, 봉사 역할, 관리자 계정, 구독
 */
import 'dotenv/config'; // 환경변수 로드
import { PrismaClient, PlanType } from '@prisma/client';
import bcrypt from 'bcryptjs';

// Prisma Client 초기화
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // 1. 요금제 생성
  console.log('📋 Creating plans...');
  const freePlan = await prisma.plan.upsert({
    where: { type: PlanType.FREE },
    update: {},
    create: {
      name: '무료 플랜',
      type: PlanType.FREE,
      price: 0,
      features: {
        maxVolunteers: 50,
        autoAssignment: false,
        support: 'email',
        description: '기본 봉사자 관리 기능',
      },
    },
  });

  const proPlan = await prisma.plan.upsert({
    where: { type: PlanType.PRO },
    update: {},
    create: {
      name: '프로 플랜',
      type: PlanType.PRO,
      price: 30000,
      features: {
        maxVolunteers: 'unlimited',
        autoAssignment: true,
        support: 'priority',
        description: 'AI 자동 배정 포함',
      },
    },
  });

  console.log('✅ Plans created:', { freePlan: freePlan.name, proPlan: proPlan.name });

  // 2. 테스트 조직 생성
  console.log('🏛️ Creating test organization...');
  const testOrg = await prisma.organization.create({
    data: {
      name: '명동성당',
      slug: 'myeongdong',
      email: 'info@myeongdong.or.kr',
      phone: '02-1234-5678',
      address: '서울특별시 중구 명동길 74',
    },
  });

  console.log('✅ Test organization created:', testOrg.name);

  // 3. 기본 봉사 역할 생성
  console.log('👥 Creating volunteer roles...');
  const roles = await prisma.volunteerRole.createMany({
    data: [
      {
        organizationId: testOrg.id,
        name: '독서',
        description: '성경 봉독',
        color: '#3B82F6',
        sortOrder: 1,
      },
      {
        organizationId: testOrg.id,
        name: '해설',
        description: '미사 해설',
        color: '#10B981',
        sortOrder: 2,
      },
      {
        organizationId: testOrg.id,
        name: '제대봉사',
        description: '제대 봉사',
        color: '#F59E0B',
        sortOrder: 3,
      },
      {
        organizationId: testOrg.id,
        name: '성가대',
        description: '성가대 봉사',
        color: '#8B5CF6',
        sortOrder: 4,
      },
    ],
  });

  console.log('✅ Volunteer roles created:', roles.count);

  // 4. 테스트 관리자 계정 생성
  console.log('👤 Creating admin user...');
  const hashedPassword = await bcrypt.hash('test1234', 10);
  const adminUser = await prisma.user.create({
    data: {
      organizationId: testOrg.id,
      email: 'admin@myeongdong.or.kr',
      password: hashedPassword,
      name: '김관리자',
      phone: '010-1234-5678',
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  console.log('✅ Admin user created:', adminUser.email);

  // 5. 무료 구독 할당
  console.log('💳 Creating subscription...');
  const subscription = await prisma.subscription.create({
    data: {
      organizationId: testOrg.id,
      planId: freePlan.id,
      status: 'ACTIVE',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(
        new Date().setMonth(new Date().getMonth() + 1)
      ),
    },
  });

  console.log('✅ Subscription created:', subscription.status);

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📝 Test credentials:');
  console.log('  Email: admin@myeongdong.or.kr');
  console.log('  Password: test1234');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
