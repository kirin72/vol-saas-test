/**
 * 봉사자 배정 API
 * GET /api/admin/assignments - 배정 목록 조회 (월별)
 * POST /api/admin/assignments - 배정 생성
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { assignmentCreateSchema } from '@/lib/validations/assignment';

// GET: 배정 목록 조회 (월별)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

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
    const month = searchParams.get('month');

    // 해당 월의 일정 조회 (배정 정보 포함)
    const whereClause: any = { organizationId };

    if (month) {
      const [year, monthNum] = month.split('-');
      const startDate = new Date(`${year}-${monthNum}-01`);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);

      whereClause.date = {
        gte: startDate,
        lt: endDate,
      };
    }

    const schedules = await prisma.massSchedule.findMany({
      where: whereClause,
      orderBy: [
        { date: 'asc' },
        { time: 'asc' },
      ],
      include: {
        massTemplate: {
          include: {
            slots: {
              include: {
                volunteerRole: true,
              },
            },
          },
        },
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                baptismalName: true,
              },
            },
            volunteerRole: true,
          },
        },
      },
    });

    return NextResponse.json(schedules);
  } catch (error) {
    console.error('배정 목록 조회 오류:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assignments' },
      { status: 500 }
    );
  }
}

// POST: 배정 생성
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

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

    // 요청 본문 파싱 및 검증
    const body = await request.json();
    const validatedData = assignmentCreateSchema.parse(body);

    // 중복 배정 체크 (같은 미사에 같은 봉사자가 이미 배정되어 있는지)
    const existingAssignment = await prisma.assignment.findFirst({
      where: {
        organizationId,
        massScheduleId: validatedData.massScheduleId,
        userId: validatedData.userId,
      },
      include: {
        volunteerRole: {
          select: {
            name: true,
          },
        },
      },
    });

    if (existingAssignment) {
      return NextResponse.json(
        {
          error: `해당 봉사자는 이미 이 미사에 "${existingAssignment.volunteerRole.name}" 역할로 배정되어 있습니다.`
        },
        { status: 409 } // 409 Conflict
      );
    }

    // 배정 생성
    const assignment = await prisma.assignment.create({
      data: {
        organizationId,
        massScheduleId: validatedData.massScheduleId,
        userId: validatedData.userId,
        volunteerRoleId: validatedData.volunteerRoleId,
        status: validatedData.status,
        notes: validatedData.notes || null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            baptismalName: true,
          },
        },
        volunteerRole: true,
      },
    });

    console.log('배정 생성 완료:', {
      id: assignment.id,
      userId: assignment.userId,
      roleId: assignment.volunteerRoleId,
    });

    return NextResponse.json(assignment, { status: 201 });
  } catch (error: any) {
    console.error('배정 생성 오류:', error);

    // Zod 검증 오류
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: '입력 데이터가 올바르지 않습니다', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create assignment' },
      { status: 500 }
    );
  }
}
