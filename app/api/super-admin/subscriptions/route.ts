/**
 * Super Admin 구독 관리 API
 * GET: 전체 구독 목록 조회
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

    // 전체 구독 조회 (조직 및 플랜 정보 포함)
    const subscriptions = await prisma.subscription.findMany({
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        plan: {
          select: {
            name: true,
            type: true,
            price: true,
          },
        },
        paymentHistory: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(subscriptions);
  } catch (error: any) {
    console.error('Subscriptions API error:', error);
    return NextResponse.json(
      { error: error.message || '구독 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
