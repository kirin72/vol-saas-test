/**
 * 봉사자 배정 API
 * GET /api/volunteer/assignments - 봉사자의 배정 목록 조회
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET: 봉사자 배정 조회
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || session.user.role !== 'VOLUNTEER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 쿼리 파라미터에서 월 정보 가져오기
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');

    let whereClause: any = {
      userId: session.user.id,
      organizationId: session.user.organizationId,
    };

    if (month) {
      // 월 시작/끝 날짜 계산
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

    // 배정 목록 조회 (요청 정보 포함)
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

    // 각 배정에 대한 PENDING 및 REJECTED 요청 조회
    const assignmentIds = assignments.map((a) => a.id);
    const requests = await prisma.assignmentRequest.findMany({
      where: {
        assignmentId: { in: assignmentIds },
        status: { in: ['PENDING', 'REJECTED'] },
      },
      select: {
        id: true,
        assignmentId: true,
        type: true,
        status: true,
        adminNotes: true,
      },
    });

    // 요청 정보를 배정에 매핑
    const assignmentsWithRequests = assignments.map((assignment) => {
      const request = requests.find((r) => r.assignmentId === assignment.id);
      return {
        ...assignment,
        request: request || null,
      };
    });

    return NextResponse.json(assignmentsWithRequests);
  } catch (error) {
    console.error('배정 조회 오류:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assignments' },
      { status: 500 }
    );
  }
}
