/**
 * Super Admin 구독 관리 페이지
 * 전체 구독 목록 및 결제 이력
 */
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface Subscription {
  id: string;
  status: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  plan: {
    name: string;
    type: string;
    price: number;
  };
  paymentHistory: Array<{
    amount: number;
    status: string;
    paidAt: string | null;
  }>;
}

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      const response = await fetch('/api/super-admin/subscriptions');
      if (!response.ok) throw new Error('구독 조회 실패');
      const data = await response.json();
      setSubscriptions(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'default';
      case 'CANCELED':
        return 'destructive';
      case 'EXPIRED':
        return 'secondary';
      default:
        return 'secondary';
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

  // 상태별 통계
  const activeCount = subscriptions.filter((s) => s.status === 'ACTIVE').length;
  const canceledCount = subscriptions.filter((s) => s.status === 'CANCELED').length;
  const totalRevenue = subscriptions
    .filter((s) => s.status === 'ACTIVE')
    .reduce((sum, s) => sum + s.plan.price, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">구독 관리</h2>
        <p className="text-gray-600 mt-2">
          모든 구독 및 결제 정보를 확인합니다
        </p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>활성 구독</CardDescription>
            <CardTitle className="text-3xl">{activeCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              전체: {subscriptions.length}개
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>취소된 구독</CardDescription>
            <CardTitle className="text-3xl">{canceledCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              해지율: {subscriptions.length > 0 ? ((canceledCount / subscriptions.length) * 100).toFixed(1) : 0}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>월 매출(MRR)</CardDescription>
            <CardTitle className="text-3xl">
              ₩{totalRevenue.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              활성 구독 기준
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 구독 목록 테이블 */}
      <Card>
        <CardHeader>
          <CardTitle>구독 목록</CardTitle>
          <CardDescription>
            총 {subscriptions.length}개 구독
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>조직</TableHead>
                <TableHead>플랜</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>구독 시작</TableHead>
                <TableHead>다음 결제일</TableHead>
                <TableHead>월 요금</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscriptions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500">
                    구독이 없습니다
                  </TableCell>
                </TableRow>
              ) : (
                subscriptions.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium">
                      <div>
                        <p>{sub.organization.name}</p>
                        <p className="text-xs text-gray-500">
                          @{sub.organization.slug}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {sub.plan.name}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(sub.status)}>
                        {sub.status}
                      </Badge>
                      {sub.cancelAtPeriodEnd && (
                        <Badge variant="secondary" className="ml-2">
                          기간 종료 시 해지
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {formatDate(sub.currentPeriodStart)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {formatDate(sub.currentPeriodEnd)}
                    </TableCell>
                    <TableCell className="font-medium">
                      ₩{sub.plan.price.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
