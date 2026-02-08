/**
 * Prisma Client 싱글톤 인스턴스
 * 개발 환경에서 Hot Reload 시 connection pool 문제를 방지합니다
 */
import { PrismaClient } from '@prisma/client';

// 전역 타입 선언 (개발 환경용)
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Prisma Client 싱글톤
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

// 개발 환경에서만 전역 객체에 저장 (Hot Reload 대응)
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
