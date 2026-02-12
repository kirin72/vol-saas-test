/**
 * 미사 템플릿 기반 월간 일정 자동 생성 API
 * POST /api/admin/templates/generate-schedules
 *
 * 선택한 템플릿의 반복 요일을 기반으로
 * 지정된 월의 모든 해당 요일에 미사 일정을 자동 생성
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateSchedulesSchema, dayOfWeekToNumber } from '@/lib/validations/template';

// POST: 월간 일정 자동 생성
export async function POST(request: NextRequest) {
  try {
    // 세션 확인
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
    const validatedData = generateSchedulesSchema.parse(body);

    // 템플릿 조회 (슬롯 포함)
    const template = await prisma.massTemplate.findFirst({
      where: {
        id: validatedData.templateId,
        organizationId,
        isActive: true,
      },
      include: {
        slots: true,
      },
    });

    if (!template) {
      return NextResponse.json(
        { error: '활성 상태의 템플릿을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 반복 요일이 설정되어 있지 않으면 에러
    const dayOfWeekArray = template.dayOfWeek as string[] | null;
    if (!dayOfWeekArray || dayOfWeekArray.length === 0) {
      return NextResponse.json(
        { error: '이 템플릿에 반복 요일이 설정되어 있지 않습니다. 먼저 템플릿을 수정해주세요.' },
        { status: 400 }
      );
    }

    // 해당 월의 모든 해당 요일 날짜 계산 (여러 요일 지원)
    const { year, month } = validatedData;
    const dates: Date[] = [];
    for (const day of dayOfWeekArray) {
      const targetDayNumber = dayOfWeekToNumber[day];
      if (targetDayNumber !== undefined) {
        dates.push(...getDatesForDayOfWeek(year, month, targetDayNumber));
      }
    }
    // 날짜순 정렬
    dates.sort((a, b) => a.getTime() - b.getTime());

    // 이미 존재하는 일정 조회 (중복 방지)
    const existingSchedules = await prisma.massSchedule.findMany({
      where: {
        organizationId,
        date: { in: dates },
        time: template.time,
      },
      select: { date: true },
    });

    // 이미 존재하는 날짜 Set
    const existingDatesSet = new Set(
      existingSchedules.map((s) => s.date.toISOString().split('T')[0])
    );

    // 생성할 날짜 필터링 (중복 제외)
    const newDates = dates.filter(
      (date) => !existingDatesSet.has(date.toISOString().split('T')[0])
    );

    // 트랜잭션으로 일정 일괄 생성
    let createdCount = 0;
    if (newDates.length > 0) {
      await prisma.$transaction(async (tx) => {
        for (const date of newDates) {
          // 각 일정마다 이 템플릿을 참조하여 생성
          await tx.massSchedule.create({
            data: {
              organizationId,
              massTemplateId: template.id,
              date,
              time: template.time,
            },
          });
          createdCount++;
        }
      });
    }

    // 건너뛴 일정 수
    const skippedCount = dates.length - newDates.length;

    console.log('월간 일정 자동 생성 완료:', {
      templateId: template.id,
      templateName: template.name,
      year,
      month,
      createdCount,
      skippedCount,
      totalDates: dates.length,
    });

    return NextResponse.json({
      message: `${createdCount}개 일정이 생성되었습니다.${skippedCount > 0 ? ` (${skippedCount}개는 이미 존재하여 건너뜀)` : ''}`,
      createdCount,
      skippedCount,
      totalDates: dates.length,
    });
  } catch (error: any) {
    console.error('월간 일정 자동 생성 오류:', error);

    // Zod 검증 오류
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: '입력 데이터가 올바르지 않습니다', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate schedules' },
      { status: 500 }
    );
  }
}

/**
 * 특정 월에서 특정 요일에 해당하는 모든 날짜를 반환
 * @param year - 연도
 * @param month - 월 (1~12)
 * @param dayOfWeek - 요일 번호 (0=일, 1=월, ..., 6=토)
 * @returns Date 배열
 */
function getDatesForDayOfWeek(year: number, month: number, dayOfWeek: number): Date[] {
  const dates: Date[] = [];
  // 해당 월의 첫째 날
  const firstDay = new Date(year, month - 1, 1);
  // 해당 월의 마지막 날
  const lastDay = new Date(year, month, 0);

  // 첫 번째 해당 요일 찾기
  const current = new Date(firstDay);
  const diff = (dayOfWeek - current.getDay() + 7) % 7;
  current.setDate(current.getDate() + diff);

  // 해당 월 내의 모든 해당 요일 수집
  while (current <= lastDay) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 7);
  }

  return dates;
}
