/**
 * 봉사자 배정 통계 API
 * GET /api/admin/assignments/stats?month=2026-02 - 월별 봉사자별 배정 횟수 조회
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET: 월별 봉사자별 배정 횟수 조회
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    // 권한 확인
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organizationId = session.user.organizationId;

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }

    // 쿼리 파라미터에서 월 정보 가져오기
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month'); // 형식: "2026-02"

    if (!month) {
      return NextResponse.json(
        { error: 'Month parameter is required (format: YYYY-MM)' },
        { status: 400 }
      );
    }

    // 해당 월의 시작일과 종료일 계산
    const [year, monthNum] = month.split('-');
    const startDate = new Date(`${year}-${monthNum}-01`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    // 해당 월의 배정 조회 (미사 일정의 날짜 기준)
    const assignments = await prisma.assignment.findMany({
      where: {
        organizationId,
        massSchedule: {
          date: {
            gte: startDate,
            lt: endDate,
          },
        },
      },
      select: {
        userId: true,
      },
    });

    // 봉사자별 배정 횟수 집계
    const statsMap = new Map<string, number>();

    assignments.forEach((assignment) => {
      const count = statsMap.get(assignment.userId) || 0;
      statsMap.set(assignment.userId, count + 1);
    });

    // Map을 객체로 변환
    const stats: Record<string, number> = {};
    statsMap.forEach((count, userId) => {
      stats[userId] = count;
    });

    console.log(`배정 통계 조회 완료 (${month}):`, {
      totalAssignments: assignments.length,
      uniqueVolunteers: statsMap.size,
    });

    return NextResponse.json(stats);
  } catch (error) {
    console.error('배정 통계 조회 오류:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assignment stats' },
      { status: 500 }
    );
  }
}
