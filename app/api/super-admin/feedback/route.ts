/**
 * 총괄관리자 피드백 목록 API
 * GET /api/super-admin/feedback - 전체 피드백 목록 조회
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET: 전체 피드백 목록 (조직명, 작성자명 포함)
export async function GET(request: NextRequest) {
  try {
    // 세션 확인 (SUPER_ADMIN만)
    const session = await auth();

    if (!session || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 쿼리 파라미터에서 상태 필터 가져오기
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    // WHERE 조건
    const whereClause: any = {};
    if (status && status !== 'ALL') {
      whereClause.status = status;
    }

    // 전체 피드백 목록 (조직, 작성자 정보 포함, 최신순)
    const feedbacks = await prisma.feedback.findMany({
      where: whereClause,
      include: {
        organization: {
          select: {
            name: true,
            groupName: true,
          },
        },
        user: {
          select: {
            name: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(feedbacks);
  } catch (error) {
    console.error('피드백 목록 조회 오류:', error);
    return NextResponse.json(
      { error: '피드백 목록 조회에 실패했습니다' },
      { status: 500 }
    );
  }
}
