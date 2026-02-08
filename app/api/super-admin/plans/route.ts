/**
 * Super Admin 플랜 목록 API
 * GET /api/super-admin/plans
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    // Super Admin 권한 확인
    if (!session || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 모든 플랜 조회
    const plans = await prisma.plan.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        price: 'asc',
      },
    });

    return NextResponse.json(plans);
  } catch (error) {
    console.error('플랜 목록 조회 오류:', error);
    return NextResponse.json(
      { error: 'Failed to fetch plans' },
      { status: 500 }
    );
  }
}
