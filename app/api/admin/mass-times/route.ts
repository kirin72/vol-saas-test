/**
 * 미사 일정 (요일별 미사시간) API
 * GET  /api/admin/mass-times - 현재 미사시간 조회 (템플릿 기반 또는 ChurchDirectory)
 * POST /api/admin/mass-times - 미사시간 저장 → 템플릿 + 12개월 일정 자동 생성
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { dayOfWeekToNumber } from '@/lib/validations/template';
import { buildTemplateData } from '@/lib/church-directory';

// 요일 영문 → 한글 매핑
const dayKorean: Record<string, string> = {
  SUNDAY: '주일',
  MONDAY: '월요일',
  TUESDAY: '화요일',
  WEDNESDAY: '수요일',
  THURSDAY: '목요일',
  FRIDAY: '금요일',
  SATURDAY: '토요일',
};

// 시간 → 오전/오후 판별
function getPeriod(time: string): 'AM' | 'PM' {
  const hour = parseInt(time.split(':')[0]);
  return hour < 12 ? 'AM' : 'PM';
}

// 미사 종류 결정 (요일 기반)
function getMassType(day: string): 'SUNDAY' | 'SATURDAY' | 'WEEKDAY' {
  if (day === 'SUNDAY') return 'SUNDAY';
  if (day === 'SATURDAY') return 'SATURDAY';
  return 'WEEKDAY';
}

// 특정 요일에 해당하는 날짜 목록 반환
function getDatesForDayOfWeek(year: number, month: number, dayOfWeek: number): Date[] {
  const dates: Date[] = [];
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const current = new Date(firstDay);
  const diff = (dayOfWeek - current.getDay() + 7) % 7;
  current.setDate(current.getDate() + diff);
  while (current <= lastDay) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 7);
  }
  return dates;
}

// 미사 템플릿 이름 생성
function buildTemplateName(day: string, time: string, orgName: string): string {
  const hour = parseInt(time.split(':')[0]);
  const min = time.split(':')[1];
  const period = hour < 12 ? '오전' : '오후';
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  const timeStr = min === '00' ? `${displayHour}시` : `${displayHour}시 ${min}분`;
  const dayStr = dayKorean[day] || day;
  return `${dayStr} ${period} ${timeStr} 미사`;
}

// GET: 현재 미사시간 조회
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organizationId = session.user.organizationId;
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    // 1. 기존 템플릿에서 요일별 미사시간 추출 (역할 슬롯 포함)
    const templates = await prisma.massTemplate.findMany({
      where: { organizationId, isActive: true },
      orderBy: { time: 'asc' },
      include: {
        slots: {
          select: { volunteerRoleId: true },
        },
      },
    });

    // 요일별 미사시간 맵
    const days: Record<string, { period: string; time: string }[]> = {
      SUNDAY: [],
      MONDAY: [],
      TUESDAY: [],
      WEDNESDAY: [],
      THURSDAY: [],
      FRIDAY: [],
      SATURDAY: [],
    };

    if (templates.length > 0) {
      // 요일별 선택된 역할 ID 맵
      const dayRoles: Record<string, string[]> = {
        SUNDAY: [], MONDAY: [], TUESDAY: [], WEDNESDAY: [],
        THURSDAY: [], FRIDAY: [], SATURDAY: [],
      };

      // 기존 템플릿에서 변환
      for (const template of templates) {
        const dayOfWeekArr = template.dayOfWeek as string[] | null;
        if (!dayOfWeekArr || dayOfWeekArr.length === 0) continue;

        // 이 템플릿의 역할 ID 목록
        const roleIds = template.slots.map((s: { volunteerRoleId: string }) => s.volunteerRoleId);

        for (const day of dayOfWeekArr) {
          if (days[day]) {
            // 중복 시간 방지
            const exists = days[day].some((t) => t.time === template.time);
            if (!exists) {
              days[day].push({
                period: getPeriod(template.time),
                time: template.time,
              });
            }

            // 역할 ID 병합 (중복 방지)
            for (const roleId of roleIds) {
              if (!dayRoles[day].includes(roleId)) {
                dayRoles[day].push(roleId);
              }
            }
          }
        }
      }

      // 각 요일 내 시간순 정렬
      for (const day of Object.keys(days)) {
        days[day].sort((a, b) => a.time.localeCompare(b.time));
      }

      return NextResponse.json({ source: 'templates', days, dayRoles });
    }

    // 2. 템플릿 없으면 ChurchDirectory에서 조회 (조직 이름으로 매칭)
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    });

    if (org) {
      // 조직명에서 "성당" 접미사 제거하여 매칭 (DB에는 "가락2동", 조직명은 "가락2동성당")
      const orgNameBase = org.name.replace(/성당$/, '');
      const church = await prisma.churchDirectory.findFirst({
        where: {
          OR: [
            { name: org.name },    // 정확한 이름 매칭: "명동성당"
            { name: orgNameBase },  // 접미사 제거 매칭: "명동"
          ],
        },
      });

      if (church && (church.sundayMass || church.weekdayMass)) {
        // buildTemplateData로 파싱
        const templateDataList = buildTemplateData(
          church.sundayMass,
          church.weekdayMass,
          org.name,
        );

        // 파싱된 데이터를 요일별 구조로 변환
        for (const tData of templateDataList) {
          for (const day of tData.dayOfWeek) {
            if (days[day]) {
              const exists = days[day].some((t) => t.time === tData.time);
              if (!exists) {
                days[day].push({
                  period: getPeriod(tData.time),
                  time: tData.time,
                });
              }
            }
          }
        }

        // 각 요일 내 시간순 정렬
        for (const day of Object.keys(days)) {
          days[day].sort((a, b) => a.time.localeCompare(b.time));
        }

        return NextResponse.json({ source: 'churchDirectory', days });
      }
    }

    // 3. 아무 데이터도 없으면 빈 구조 반환
    return NextResponse.json({ source: 'empty', days });
  } catch (error) {
    console.error('미사시간 조회 오류:', error);
    return NextResponse.json({ error: 'Failed to fetch mass times' }, { status: 500 });
  }
}

// POST: 미사시간 저장 → 템플릿 + 일정 재생성
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organizationId = session.user.organizationId;
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const { days, dayRoles } = body as {
      days: Record<string, { period: string; time: string }[]>;
      dayRoles?: Record<string, string[]>; // 요일별 선택된 역할 ID
    };

    if (!days) {
      return NextResponse.json({ error: '미사시간 데이터가 필요합니다.' }, { status: 400 });
    }

    // 조직 이름 조회 (템플릿 이름 생성용)
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    });

    // 활성 역할 조회 (슬롯 생성용)
    const activeRoles = await prisma.volunteerRole.findMany({
      where: { organizationId, isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    // 동일 시간의 평일들을 그룹핑하기 위한 맵
    // key: time, value: days[]
    const weekdayTimeMap: Record<string, string[]> = {};
    const sundayTimes: string[] = [];
    const saturdayTimes: string[] = [];

    // 요일별 시간 데이터 파싱
    for (const [day, times] of Object.entries(days)) {
      if (!times || times.length === 0) continue;

      for (const { time } of times) {
        if (!time) continue;

        if (day === 'SUNDAY') {
          if (!sundayTimes.includes(time)) sundayTimes.push(time);
        } else if (day === 'SATURDAY') {
          if (!saturdayTimes.includes(time)) saturdayTimes.push(time);
        } else {
          // 평일 (월~금) — 같은 시간은 하나의 템플릿으로 그룹핑
          if (!weekdayTimeMap[time]) weekdayTimeMap[time] = [];
          if (!weekdayTimeMap[time].includes(day)) {
            weekdayTimeMap[time].push(day);
          }
        }
      }
    }

    // 생성할 템플릿 목록
    interface TemplateToCreate {
      name: string;
      massType: 'SUNDAY' | 'SATURDAY' | 'WEEKDAY';
      dayOfWeek: string[];
      time: string;
    }

    const templatesToCreate: TemplateToCreate[] = [];

    // 주일 미사 템플릿
    for (const time of sundayTimes) {
      templatesToCreate.push({
        name: buildTemplateName('SUNDAY', time, org?.name || ''),
        massType: 'SUNDAY',
        dayOfWeek: ['SUNDAY'],
        time,
      });
    }

    // 토요일 미사 템플릿
    for (const time of saturdayTimes) {
      templatesToCreate.push({
        name: buildTemplateName('SATURDAY', time, org?.name || ''),
        massType: 'SATURDAY',
        dayOfWeek: ['SATURDAY'],
        time,
      });
    }

    // 평일 미사 템플릿 (같은 시간 그룹)
    for (const [time, weekdays] of Object.entries(weekdayTimeMap)) {
      // 요일 정렬 (월~금 순서)
      const dayOrder = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
      weekdays.sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b));

      // 이름 생성
      const dayNames = weekdays.map((d) => dayKorean[d] || d);
      let dayLabel: string;
      if (weekdays.length === 5) {
        dayLabel = '평일';
      } else if (weekdays.length >= 3) {
        dayLabel = dayNames.map((n) => n.replace('요일', '')).join(',');
      } else {
        dayLabel = dayNames.join(',');
      }

      const hour = parseInt(time.split(':')[0]);
      const min = time.split(':')[1];
      const period = hour < 12 ? '오전' : '오후';
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      const timeStr = min === '00' ? `${displayHour}시` : `${displayHour}시 ${min}분`;

      templatesToCreate.push({
        name: `${dayLabel} ${period} ${timeStr} 미사`,
        massType: 'WEEKDAY',
        dayOfWeek: weekdays,
        time,
      });
    }

    // 트랜잭션으로 기존 데이터 삭제 + 새 템플릿/일정 생성
    const result = await prisma.$transaction(async (tx) => {
      // 1. 기존 템플릿 전체 삭제 (cascade: slots, schedules → assignments)
      await tx.massTemplate.deleteMany({
        where: { organizationId },
      });

      let templatesCreated = 0;
      let schedulesCreated = 0;

      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;

      // 2. 새 템플릿 + 슬롯 + 12개월 일정 생성
      for (const tData of templatesToCreate) {
        // 템플릿 생성
        const template = await tx.massTemplate.create({
          data: {
            organizationId,
            name: tData.name,
            massType: tData.massType,
            dayOfWeek: tData.dayOfWeek,
            time: tData.time,
            isActive: true,
          },
        });

        // 역할 슬롯 생성 (dayRoles가 있으면 해당 요일의 선택된 역할만 사용)
        let rolesToUse = activeRoles;
        if (dayRoles) {
          // 이 템플릿의 모든 요일에서 선택된 역할의 합집합
          const selectedRoleIds = new Set<string>();
          for (const day of tData.dayOfWeek) {
            if (dayRoles[day]) {
              for (const roleId of dayRoles[day]) {
                selectedRoleIds.add(roleId);
              }
            }
          }
          if (selectedRoleIds.size > 0) {
            rolesToUse = activeRoles.filter((role) => selectedRoleIds.has(role.id));
          }
        }

        if (rolesToUse.length > 0) {
          await tx.templateSlot.createMany({
            data: rolesToUse.map((role) => ({
              massTemplateId: template.id,
              volunteerRoleId: role.id,
              requiredCount: 1,
            })),
          });
        }

        templatesCreated++;

        // 12개월 일정 생성
        for (const day of tData.dayOfWeek) {
          const dayNum = dayOfWeekToNumber[day];
          if (dayNum === undefined) continue;

          const allDates: Date[] = [];
          for (let m = 0; m < 12; m++) {
            const targetMonth = ((currentMonth - 1 + m) % 12) + 1;
            const targetYear = currentYear + Math.floor((currentMonth - 1 + m) / 12);
            allDates.push(...getDatesForDayOfWeek(targetYear, targetMonth, dayNum));
          }

          // 오늘 이후 날짜만 필터
          const futureDates = allDates.filter((d) => d >= now);

          if (futureDates.length > 0) {
            await tx.massSchedule.createMany({
              data: futureDates.map((date) => ({
                organizationId,
                massTemplateId: template.id,
                date,
                time: tData.time,
              })),
            });
            schedulesCreated += futureDates.length;
          }
        }
      }

      return { templatesCreated, schedulesCreated };
    });

    console.log('미사시간 저장 완료:', result);

    return NextResponse.json({
      message: `${result.templatesCreated}개 템플릿, ${result.schedulesCreated}개 일정이 생성되었습니다.`,
      ...result,
    });
  } catch (error) {
    console.error('미사시간 저장 오류:', error);
    return NextResponse.json({ error: 'Failed to save mass times' }, { status: 500 });
  }
}
