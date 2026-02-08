/**
 * Super Admin 대시보드
 * MRR, 조직 수, 구독 현황 등 통계 표시
 */
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Stats {
  totalOrganizations: number;
  activeOrganizations: number;
  totalSubscriptions: number;
  activeSubscriptions: number;
  recentOrganizations: number;
  mrr: number;
  planStats: Array<{
    planName: string;
    planType: string;
    count: number;
    revenue: number;
  }>;
}

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/super-admin/stats');
      if (!response.ok) throw new Error('통계 조회 실패');
      const data = await response.json();
      setStats(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">로딩 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-700">
        {error}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">대시보드</h2>
        <p className="text-gray-600 mt-2">
          전체 시스템 현황을 한눈에 확인하세요
        </p>
      </div>

      {/* 주요 지표 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* MRR */}
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>월 매출(MRR)</CardDescription>
            <CardTitle className="text-3xl">
              ₩{stats.mrr.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              활성 구독 기준
            </p>
          </CardContent>
        </Card>

        {/* 전체 조직 수 */}
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>전체 조직</CardDescription>
            <CardTitle className="text-3xl">
              {stats.totalOrganizations}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              활성: {stats.activeOrganizations}개
            </p>
          </CardContent>
        </Card>

        {/* 활성 구독 */}
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>활성 구독</CardDescription>
            <CardTitle className="text-3xl">
              {stats.activeSubscriptions}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              전체: {stats.totalSubscriptions}개
            </p>
          </CardContent>
        </Card>

        {/* 최근 가입 */}
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>최근 7일 가입</CardDescription>
            <CardTitle className="text-3xl">
              {stats.recentOrganizations}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              신규 조직
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 플랜별 통계 */}
      <Card>
        <CardHeader>
          <CardTitle>플랜별 구독 현황</CardTitle>
          <CardDescription>
            각 플랜별 활성 구독 수와 매출
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.planStats.map((plan) => (
              <div
                key={plan.planType}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    {plan.planName}
                  </p>
                  <p className="text-sm text-gray-600">
                    {plan.count}개 구독
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-lg text-gray-900">
                    ₩{plan.revenue.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600">
                    /월
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
