/**
 * 본당 관리자 대시보드 통계 API
 * GET /api/admin/stats
 * 봉사자 수, 역할 수, 이번 달 미사 수, 배정 완료율 반환
 */
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
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

    // 이번 달 시작/종료 날짜 계산
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // 1. 전체 봉사자 수
    const volunteerCount = await prisma.user.count({
      where: {
        organizationId,
        role: 'VOLUNTEER',
        status: 'ACTIVE',
      },
    });

    // 2. 전체 역할 수
    const roleCount = await prisma.volunteerRole.count({
      where: {
        organizationId,
        isActive: true,
      },
    });

    // 3. 이번 달 미사 수
    const massCount = await prisma.massSchedule.count({
      where: {
        organizationId,
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    });

    // 4. 이번 달 배정 완료율 계산
    // 필요한 총 슬롯 수와 배정된 슬롯 수를 계산
    const masses = await prisma.massSchedule.findMany({
      where: {
        organizationId,
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      include: {
        massTemplate: {
          include: {
            slots: true, // 템플릿 슬롯
          },
        },
        assignments: true, // 실제 배정
      },
    });

    // 총 필요 슬롯 수 (각 미사의 템플릿 슬롯 * requiredCount 합산)
    let totalRequiredSlots = 0;
    // 배정된 슬롯 수
    let assignedSlots = 0;

    masses.forEach((mass) => {
      if (mass.massTemplate) {
        // 템플릿이 있는 경우
        mass.massTemplate.slots.forEach((slot) => {
          totalRequiredSlots += slot.requiredCount;
        });
        assignedSlots += mass.assignments.length;
      }
    });

    // 배정 완료율 (%)
    const assignmentRate =
      totalRequiredSlots > 0
        ? Math.round((assignedSlots / totalRequiredSlots) * 100)
        : 0;

    // 응답
    return NextResponse.json({
      volunteerCount,
      roleCount,
      massCount,
      assignmentRate,
    });
  } catch (error) {
    console.error('통계 조회 오류:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
