/**
 * 관리자 본인의 봉사 배정 조회 API
 * GET /api/admin/my-assignments - 관리자 자신의 이번 달 배정 목록 조회
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET: 관리자 본인의 배정 조회
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    // 관리자만 접근 가능
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 쿼리 파라미터에서 월 정보 가져오기
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');

    // 배정 조회 조건
    const whereClause: any = {
      userId: session.user.id,
      organizationId: session.user.organizationId,
    };

    // 월별 필터링
    if (month) {
      const [year, monthNum] = month.split('-');
      const startDate = new Date(`${year}-${monthNum}-01`);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);

      whereClause.massSchedule = {
        date: {
          gte: startDate,
          lt: endDate,
        },
      };
    }

    // 배정 목록 조회
    const assignments = await prisma.assignment.findMany({
      where: whereClause,
      include: {
        massSchedule: {
          select: {
            id: true,
            date: true,
            time: true,
            notes: true,
            massTemplate: {
              select: {
                massType: true,
              },
            },
          },
        },
        volunteerRole: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
      orderBy: {
        massSchedule: {
          date: 'asc',
        },
      },
    });

    return NextResponse.json(assignments);
  } catch (error) {
    console.error('관리자 배정 조회 오류:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assignments' },
      { status: 500 }
    );
  }
}
