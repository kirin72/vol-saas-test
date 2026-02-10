/**
 * 성당 디렉토리 시드 스크립트
 * church-directory.json 파일을 읽어 ChurchDirectory 테이블에 일괄 삽입
 * 실행: npx tsx prisma/seed-church-directory.ts
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

// Prisma Client 초기화
const prisma = new PrismaClient();

// JSON 데이터 타입 (스크래퍼 출력 형식)
interface ChurchData {
  diocese: string;   // 교구명
  name: string;      // 성당명
  address: string;   // 주소
  phone: string;     // 전화번호
  sundayMass: string; // 주일미사
  weekdayMass: string; // 평일미사
}

async function main() {
  console.log('=== 성당 디렉토리 시드 시작 ===\n');

  // JSON 파일 경로
  const jsonPath = path.join(__dirname, 'seed-data', 'church-directory.json');

  // 파일 존재 확인
  if (!fs.existsSync(jsonPath)) {
    console.error(`파일을 찾을 수 없습니다: ${jsonPath}`);
    console.error('먼저 스크래퍼를 실행하세요: node scripts/scrape-all-dioceses.js');
    process.exit(1);
  }

  // JSON 파일 읽기
  const rawData = fs.readFileSync(jsonPath, 'utf-8');
  const churches: ChurchData[] = JSON.parse(rawData);

  console.log(`JSON 파일 로드 완료: ${churches.length}개 성당`);

  // 기존 데이터 삭제
  const deleted = await prisma.churchDirectory.deleteMany();
  console.log(`기존 데이터 삭제: ${deleted.count}개`);

  // 일괄 삽입 (Prisma createMany는 한 번에 최대 1000개 제한 → 500개씩 배치)
  const BATCH_SIZE = 500;
  let totalInserted = 0;

  for (let i = 0; i < churches.length; i += BATCH_SIZE) {
    const batch = churches.slice(i, i + BATCH_SIZE);

    await prisma.churchDirectory.createMany({
      data: batch.map((c) => ({
        diocese: c.diocese,
        name: c.name,
        address: c.address || null,
        phone: c.phone || null,
        sundayMass: c.sundayMass || null,
        weekdayMass: c.weekdayMass || null,
      })),
    });

    totalInserted += batch.length;
    console.log(`  삽입 진행: ${totalInserted}/${churches.length}`);
  }

  // 교구별 통계 출력
  console.log('\n=== 교구별 통계 ===');
  const stats = await prisma.churchDirectory.groupBy({
    by: ['diocese'],
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
  });

  for (const stat of stats) {
    console.log(`  ${stat.diocese}: ${stat._count.id}개`);
  }

  const total = await prisma.churchDirectory.count();
  console.log(`  ─────────────`);
  console.log(`  총계: ${total}개`);

  // 데이터 품질 통계
  const withAddress = await prisma.churchDirectory.count({
    where: { address: { not: '' } },
  });
  const withMass = await prisma.churchDirectory.count({
    where: {
      OR: [
        { sundayMass: { not: '' } },
        { weekdayMass: { not: '' } },
      ],
    },
  });

  console.log(`\n=== 데이터 품질 ===`);
  console.log(`  주소 있음: ${withAddress}개 (${Math.round(withAddress / total * 100)}%)`);
  console.log(`  미사시간 있음: ${withMass}개 (${Math.round(withMass / total * 100)}%)`);

  console.log('\n=== 시드 완료 ===');
}

main()
  .catch((e) => {
    console.error('시드 실패:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
