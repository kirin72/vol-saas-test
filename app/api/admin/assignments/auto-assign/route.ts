/**
 * AI 자동배정 API
 * POST /api/admin/assignments/auto-assign
 * 해당 월의 미충족 슬롯에 봉사자를 자동 배정
 *
 * 알고리즘:
 * 1. 해당 월의 모든 일정 + 슬롯 + 기존 배정 조회
 * 2. 해당 조직의 활성 봉사자 조회 (역할, 성별, 가용성 포함)
 * 3. 미충족 슬롯마다 점수 기반으로 최적 봉사자 선택
 *    - 성별 우선 매칭: +10점
 *    - 배정 균등: (최대배정 - 현재배정) * 5점
 *    - 선호 요일 매칭: +3점
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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

    // 요청 본문에서 month 파라미터 가져오기 (예: "2026-02")
    const body = await request.json();
    const { month } = body;

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json(
        { error: 'month 파라미터가 올바르지 않습니다 (예: 2026-02)' },
        { status: 400 }
      );
    }

    // 해당 월의 시작일과 종료일 계산
    const [yearStr, monthStr] = month.split('-');
    const year = parseInt(yearStr);
    const monthNum = parseInt(monthStr);
    const startDate = new Date(year, monthNum - 1, 1); // 월 시작
    const endDate = new Date(year, monthNum, 0, 23, 59, 59); // 월 마지막

    // 1. 해당 월의 모든 일정 조회 (슬롯, 기존 배정 포함)
    const schedules = await prisma.massSchedule.findMany({
      where: {
        organizationId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        massTemplate: {
          include: {
            slots: {
              include: {
                volunteerRole: true, // 역할 정보 (genderPreference 포함)
              },
            },
          },
        },
        assignments: true, // 기존 배정
      },
      orderBy: {
        date: 'asc',
      },
    });

    // 2. 해당 조직의 모든 활성 봉사자 조회
    const volunteers = await prisma.user.findMany({
      where: {
        organizationId,
        role: 'VOLUNTEER',
        status: 'ACTIVE',
      },
      include: {
        userRoles: {
          include: {
            volunteerRole: true,
          },
        },
      },
    });

    // 3. 해당 월 봉사자별 기존 배정 횟수 계산
    const assignmentCounts: Record<string, number> = {};
    for (const vol of volunteers) {
      assignmentCounts[vol.id] = 0;
    }

    // 기존 배정에서 횟수 집계
    for (const schedule of schedules) {
      for (const assignment of schedule.assignments) {
        if (assignmentCounts[assignment.userId] !== undefined) {
          assignmentCounts[assignment.userId]++;
        }
      }
    }

    // 4. 미충족 슬롯에 대해 자동 배정 수행
    let created = 0; // 새로 배정된 수
    let skipped = 0; // 적합한 봉사자 없어 건너뛴 수

    // 배정 데이터를 모아서 한번에 생성할 배열
    const newAssignments: {
      organizationId: string;
      massScheduleId: string;
      userId: string;
      volunteerRoleId: string;
    }[] = [];

    // 일정별 이미 배정된 봉사자 ID 추적 (같은 일정에 중복 배정 방지)
    const scheduleAssignedUsers: Record<string, Set<string>> = {};

    for (const schedule of schedules) {
      // 일정별 기존 배정 봉사자 Set 초기화
      if (!scheduleAssignedUsers[schedule.id]) {
        scheduleAssignedUsers[schedule.id] = new Set(
          schedule.assignments.map((a) => a.userId)
        );
      }

      // 템플릿이 없는 일정은 건너뜀
      if (!schedule.massTemplate) continue;

      // 일정 날짜 정보
      const scheduleDate = new Date(schedule.date);
      const dayOfWeek = scheduleDate.getDay(); // 0=일, 1=월, ..., 6=토
      const dateStr = scheduleDate.toISOString().split('T')[0]; // "YYYY-MM-DD"

      // 각 슬롯에 대해 미충족 인원 확인
      for (const slot of schedule.massTemplate.slots) {
        // 이 슬롯의 역할에 대한 기존 배정 수
        const existingAssignmentsForSlot = schedule.assignments.filter(
          (a) => a.volunteerRoleId === slot.volunteerRoleId
        ).length;

        // 이미 해당 슬롯의 새 배정으로 추가된 수도 포함
        const newAssignmentsForSlot = newAssignments.filter(
          (a) =>
            a.massScheduleId === schedule.id &&
            a.volunteerRoleId === slot.volunteerRoleId
        ).length;

        const totalAssigned = existingAssignmentsForSlot + newAssignmentsForSlot;

        // 미충족 인원 계산
        const needed = slot.requiredCount - totalAssigned;
        if (needed <= 0) continue; // 이미 충족됨

        // 필요한 인원만큼 반복
        for (let i = 0; i < needed; i++) {
          // 후보 봉사자 필터링
          const candidates = volunteers.filter((vol) => {
            // 1) 해당 역할을 가진 봉사자만
            const hasRole = vol.userRoles.some(
              (ur) => ur.volunteerRoleId === slot.volunteerRoleId
            );
            if (!hasRole) return false;

            // 2) 이미 이 일정에 배정된 봉사자 제외
            if (scheduleAssignedUsers[schedule.id]?.has(vol.id)) return false;

            // 3) 이번 달 참여 불가 봉사자 제외
            if (vol.availableThisMonth === false) return false;

            // 4) 불가 날짜에 해당하는 봉사자 제외
            const unavailableDates = vol.unavailableDates as string[] | null;
            if (unavailableDates && unavailableDates.includes(dateStr)) return false;

            // 5) 불가 요일에 해당하는 봉사자 제외
            const unavailableDays = vol.unavailableDays as number[] | null;
            if (unavailableDays && unavailableDays.includes(dayOfWeek)) return false;

            return true;
          });

          if (candidates.length === 0) {
            skipped++;
            continue;
          }

          // 점수 계산
          const maxAssignments = Math.max(
            ...Object.values(assignmentCounts),
            1
          );

          const scoredCandidates = candidates.map((vol) => {
            let score = 0;

            // 성별 우선 매칭: +10점
            const genderPref = slot.volunteerRole.genderPreference;
            if (genderPref === 'MALE_PREFERRED' && vol.gender === 'MALE') {
              score += 10;
            } else if (genderPref === 'FEMALE_PREFERRED' && vol.gender === 'FEMALE') {
              score += 10;
            }

            // 배정 균등: 배정 적은 봉사자 우선 (최대 배정 - 현재 배정) * 5점
            const currentCount = assignmentCounts[vol.id] || 0;
            score += (maxAssignments - currentCount) * 5;

            // 선호 요일 매칭: +3점
            const preferredDays = vol.preferredDays as number[] | null;
            if (preferredDays && preferredDays.includes(dayOfWeek)) {
              score += 3;
            }

            return { volunteer: vol, score };
          });

          // 점수 높은 순 정렬 (동점이면 랜덤)
          scoredCandidates.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return Math.random() - 0.5; // 동점시 랜덤
          });

          // 최고 점수 봉사자 배정
          const selected = scoredCandidates[0].volunteer;

          newAssignments.push({
            organizationId,
            massScheduleId: schedule.id,
            userId: selected.id,
            volunteerRoleId: slot.volunteerRoleId,
          });

          // 추적 정보 업데이트
          scheduleAssignedUsers[schedule.id].add(selected.id);
          assignmentCounts[selected.id] = (assignmentCounts[selected.id] || 0) + 1;
          created++;
        }
      }
    }

    // 5. 새 배정을 DB에 일괄 저장
    if (newAssignments.length > 0) {
      await prisma.assignment.createMany({
        data: newAssignments.map((a) => ({
          organizationId: a.organizationId,
          massScheduleId: a.massScheduleId,
          userId: a.userId,
          volunteerRoleId: a.volunteerRoleId,
          status: 'ASSIGNED',
        })),
      });
    }

    console.log('자동배정 완료:', {
      month,
      created,
      skipped,
      totalSchedules: schedules.length,
      totalVolunteers: volunteers.length,
    });

    return NextResponse.json({
      created, // 새로 배정된 수
      skipped, // 적합한 봉사자 없어 건너뛴 수
      totalSchedules: schedules.length,
      totalVolunteers: volunteers.length,
    });
  } catch (error) {
    console.error('자동배정 오류:', error);
    return NextResponse.json(
      { error: '자동배정 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
