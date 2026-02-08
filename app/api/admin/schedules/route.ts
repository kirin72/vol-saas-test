/**
 * 미사 일정 API
 * GET /api/admin/schedules - 일정 목록 조회 (월별)
 * POST /api/admin/schedules - 일정 생성
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { scheduleCreateSchema } from '@/lib/validations/schedule';

// GET: 일정 목록 조회 (월별)
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

    // 쿼리 파라미터에서 월 정보 가져오기 (예: 2026-02)
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');

    let whereClause: any = { organizationId };

    if (month) {
      // 월 시작/끝 날짜 계산
      const [year, monthNum] = month.split('-');
      const startDate = new Date(`${year}-${monthNum}-01`);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);

      whereClause.date = {
        gte: startDate,
        lt: endDate,
      };
    }

    // 일정 목록 조회
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
                volunteerRole: true, // 역할 정보 포함
              },
            },
          },
        },
        _count: {
          select: {
            assignments: true, // 배정된 봉사자 수
          },
        },
      },
    });

    return NextResponse.json(schedules);
  } catch (error) {
    console.error('일정 목록 조회 오류:', error);
    return NextResponse.json(
      { error: 'Failed to fetch schedules' },
      { status: 500 }
    );
  }
}

// POST: 일정 생성
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
    const validatedData = scheduleCreateSchema.parse(body);

    // 중복 일정 체크 (같은 날짜 + 같은 시간)
    const existingSchedule = await prisma.massSchedule.findFirst({
      where: {
        organizationId,
        date: new Date(validatedData.date),
        time: validatedData.time,
      },
    });

    if (existingSchedule) {
      return NextResponse.json(
        { error: '동일한 날짜와 시간에 이미 일정이 존재합니다.' },
        { status: 409 } // 409 Conflict
      );
    }

    // 트랜잭션으로 템플릿 + 슬롯 + 일정 생성
    const schedule = await prisma.$transaction(async (tx) => {
      // 1. 임시 템플릿 생성 (일정마다 하나씩)
      const template = await tx.massTemplate.create({
        data: {
          organizationId,
          name: `${validatedData.date} ${validatedData.time} 미사`,
          massType: validatedData.massType,
          time: validatedData.time,
          isActive: true,
        },
      });

      // 2. 역할별 슬롯 생성
      await tx.templateSlot.createMany({
        data: validatedData.requiredRoles.map((role) => ({
          massTemplateId: template.id,
          volunteerRoleId: role.roleId,
          requiredCount: role.count,
        })),
      });

      // 3. 일정 생성
      const newSchedule = await tx.massSchedule.create({
        data: {
          organizationId,
          massTemplateId: template.id,
          date: new Date(validatedData.date),
          time: validatedData.time,
          notes: validatedData.notes || null,
        },
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
        },
      });

      return newSchedule;
    });

    console.log('일정 생성 완료:', {
      id: schedule.id,
      date: schedule.date,
    });

    return NextResponse.json(schedule, { status: 201 });
  } catch (error: any) {
    console.error('일정 생성 오류:', error);

    // Zod 검증 오류
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: '입력 데이터가 올바르지 않습니다', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create schedule' },
      { status: 500 }
    );
  }
}
