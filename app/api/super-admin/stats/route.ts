/**
 * Super Admin 대시보드 통계 API
 * MRR(Monthly Recurring Revenue), 조직 수, 구독 현황 등
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    // Super Admin 권한 확인
    if (!session || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 병렬로 통계 데이터 가져오기
    const [
      totalOrganizations,
      activeOrganizations,
      totalSubscriptions,
      activeSubscriptions,
      subscriptionsByPlan,
      recentOrganizations,
    ] = await Promise.all([
      // 전체 조직 수
      prisma.organization.count(),

      // 활성 조직 수
      prisma.organization.count({
        where: { isActive: true },
      }),

      // 전체 구독 수
      prisma.subscription.count(),

      // 활성 구독 수
      prisma.subscription.count({
        where: { status: 'ACTIVE' },
      }),

      // 플랜별 구독 수
      prisma.subscription.groupBy({
        by: ['planId'],
        where: { status: 'ACTIVE' },
        _count: true,
      }),

      // 최근 가입한 조직 (7일 이내)
      prisma.organization.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    // MRR 계산 (활성 구독의 월 매출)
    const subscriptionsWithPlan = await prisma.subscription.findMany({
      where: { status: 'ACTIVE' },
      include: { plan: true },
    });

    const mrr = subscriptionsWithPlan.reduce(
      (sum, sub) => sum + sub.plan.price,
      0
    );

    // 플랜별 구독 상세 정보
    const plans = await prisma.plan.findMany();
    const planStats = await Promise.all(
      plans.map(async (plan) => {
        const count = await prisma.subscription.count({
          where: {
            planId: plan.id,
            status: 'ACTIVE',
          },
        });
        return {
          planName: plan.name,
          planType: plan.type,
          count,
          revenue: count * plan.price,
        };
      })
    );

    return NextResponse.json({
      totalOrganizations,
      activeOrganizations,
      totalSubscriptions,
      activeSubscriptions,
      recentOrganizations,
      mrr,
      planStats,
    });
  } catch (error: any) {
    console.error('Stats API error:', error);
    return NextResponse.json(
      { error: error.message || '통계 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
