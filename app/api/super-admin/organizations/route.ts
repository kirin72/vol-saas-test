/**
 * Super Admin 조직 관리 API
 * GET: 전체 조직 목록 조회
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    // Super Admin 권한 확인
    if (!session || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 전체 조직 조회 (구독 정보 포함)
    const organizations = await prisma.organization.findMany({
      include: {
        subscriptions: {
          include: {
            plan: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
        _count: {
          select: {
            users: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(organizations);
  } catch (error: any) {
    console.error('Organizations API error:', error);
    return NextResponse.json(
      { error: error.message || '조직 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
