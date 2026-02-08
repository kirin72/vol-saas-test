/**
 * Super Admin 조직 상세/수정 페이지
 * 조직 정보 + 구독 관리
 */
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface Organization {
  id: string;
  name: string;
  slug: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  isActive: boolean;
  createdAt: string;
  subscriptions: Array<{
    id: string;
    status: string;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    plan: {
      id: string;
      name: string;
      type: string;
      price: number;
    };
  }>;
  users: Array<{
    id: string;
    name: string;
    email: string;
    phone: string | null;
    role: string;
  }>;
  _count: {
    users: number;
  };
}

interface Plan {
  id: string;
  name: string;
  type: string;
  price: number;
}

interface FormData {
  name: string;
  slug: string;
  phone: string;
  email: string;
  address: string;
  isActive: boolean;
  // 구독 정보
  planId: string;
  subscriptionStatus: string;
  currentPeriodStart: string;
  // 관리자 정보
  adminName: string;
  adminEmail: string;
  adminPhone: string;
  adminPassword: string;
}

export default function OrganizationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orgId = params.id as string;

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>();

  // 조직 및 플랜 데이터 가져오기
  useEffect(() => {
    async function fetchData() {
      try {
        // 조직 정보
        const orgRes = await fetch(`/api/super-admin/organizations/${orgId}`);
        if (orgRes.ok) {
          const orgData = await orgRes.json();
          setOrganization(orgData);

          // 폼 초기값 설정
          const subscription = orgData.subscriptions[0];
          const admin = orgData.users.find((u: any) => u.role === 'ADMIN');

          reset({
            name: orgData.name,
            slug: orgData.slug,
            phone: orgData.phone || '',
            email: orgData.email || '',
            address: orgData.address || '',
            isActive: orgData.isActive,
            planId: subscription?.plan.id || '',
            subscriptionStatus: subscription?.status || 'PENDING',
            currentPeriodStart: subscription?.currentPeriodStart
              ? new Date(subscription.currentPeriodStart).toISOString().split('T')[0]
              : new Date().toISOString().split('T')[0],
            adminName: admin?.name || '',
            adminEmail: admin?.email || '',
            adminPhone: admin?.phone || '',
            adminPassword: '',
          });
        }

        // 플랜 목록
        const plansRes = await fetch('/api/super-admin/plans');
        if (plansRes.ok) {
          const plansData = await plansRes.json();
          setPlans(plansData);
        }
      } catch (error) {
        console.error('데이터 로딩 실패:', error);
        setError('데이터를 불러오는 중 오류가 발생했습니다');
      } finally {
        setLoadingData(false);
      }
    }
    fetchData();
  }, [orgId, reset]);

  // 폼 제출
  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/super-admin/organizations/${orgId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        alert('조직 정보가 수정되었습니다');
        router.push('/super-admin/organizations');
        router.refresh();
      } else {
        const errorData = await res.json();
        setError(errorData.error || '조직 수정에 실패했습니다');
      }
    } catch (error) {
      console.error('조직 수정 오류:', error);
      setError('조직 수정 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">조직을 찾을 수 없습니다</p>
            <Button asChild className="mt-4">
              <Link href="/super-admin/organizations">목록으로 돌아가기</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 뒤로가기 */}
      <Link
        href="/super-admin/organizations"
        className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        조직 목록으로 돌아가기
      </Link>

      {/* 조직 기본 정보 */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>조직 정보 수정</CardTitle>
              <CardDescription>
                {organization.name}
                <Badge className="ml-2" variant={organization.isActive ? 'default' : 'secondary'}>
                  {organization.isActive ? '활성' : '비활성'}
                </Badge>
              </CardDescription>
            </div>
            <div className="text-right text-sm text-gray-600">
              <p>사용자 수: {organization._count.users}명</p>
              <p>가입일: {new Date(organization.createdAt).toLocaleDateString('ko-KR')}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* 조직 기본 정보 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">기본 정보</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">조직명 *</Label>
                  <Input
                    id="name"
                    {...register('name', { required: true })}
                    disabled={loading}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-600">조직명은 필수입니다</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug">URL 식별자 *</Label>
                  <Input
                    id="slug"
                    {...register('slug', { required: true })}
                    disabled={loading}
                  />
                  {errors.slug && (
                    <p className="text-sm text-red-600">URL 식별자는 필수입니다</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">전화번호</Label>
                  <Input
                    id="phone"
                    {...register('phone')}
                    placeholder="02-1234-5678"
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">이메일</Label>
                  <Input
                    id="email"
                    type="email"
                    {...register('email')}
                    placeholder="info@church.or.kr"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">주소</Label>
                <Input
                  id="address"
                  {...register('address')}
                  placeholder="서울특별시 중구 명동길 74"
                  disabled={loading}
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isActive"
                  {...register('isActive')}
                  className="w-4 h-4 rounded border-gray-300"
                  disabled={loading}
                />
                <Label htmlFor="isActive" className="cursor-pointer">
                  조직 활성화 (비활성화 시 로그인 불가)
                </Label>
              </div>
            </div>

            {/* 관리자 정보 */}
            <div className="space-y-4 border-t pt-6">
              <h3 className="text-lg font-semibold">관리자 정보</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="adminName">관리자 이름 *</Label>
                  <Input
                    id="adminName"
                    {...register('adminName', { required: true })}
                    placeholder="김관리자"
                    disabled={loading}
                  />
                  {errors.adminName && (
                    <p className="text-sm text-red-600">관리자 이름은 필수입니다</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adminPhone">관리자 전화번호</Label>
                  <Input
                    id="adminPhone"
                    {...register('adminPhone')}
                    placeholder="010-1234-5678"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="adminEmail">관리자 이메일 *</Label>
                <Input
                  id="adminEmail"
                  type="email"
                  {...register('adminEmail', { required: true })}
                  placeholder="admin@church.or.kr"
                  disabled={loading}
                />
                {errors.adminEmail && (
                  <p className="text-sm text-red-600">관리자 이메일은 필수입니다</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="adminPassword">
                  관리자 비밀번호 (변경 시에만 입력)
                </Label>
                <Input
                  id="adminPassword"
                  type="password"
                  {...register('adminPassword')}
                  placeholder="비밀번호를 변경하려면 입력하세요"
                  disabled={loading}
                />
                <p className="text-xs text-gray-500">
                  비밀번호를 변경하지 않으려면 비워두세요
                </p>
              </div>
            </div>

            {/* 구독 정보 */}
            <div className="space-y-4 border-t pt-6">
              <h3 className="text-lg font-semibold">구독 관리</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="planId">플랜 *</Label>
                  <select
                    id="planId"
                    {...register('planId', { required: true })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={loading}
                  >
                    <option value="">플랜 선택</option>
                    {plans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name} - ₩{plan.price.toLocaleString()}/월
                      </option>
                    ))}
                  </select>
                  {errors.planId && (
                    <p className="text-sm text-red-600">플랜을 선택해주세요</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subscriptionStatus">구독 상태 *</Label>
                  <select
                    id="subscriptionStatus"
                    {...register('subscriptionStatus', { required: true })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={loading}
                  >
                    <option value="ACTIVE">활성 (ACTIVE)</option>
                    <option value="CANCELED">취소됨 (CANCELED)</option>
                    <option value="EXPIRED">만료됨 (EXPIRED)</option>
                    <option value="PENDING">대기 (PENDING)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="currentPeriodStart">구독 시작일 *</Label>
                <Input
                  id="currentPeriodStart"
                  type="date"
                  {...register('currentPeriodStart', { required: true })}
                  disabled={loading}
                />
                <p className="text-xs text-gray-500">
                  구독 종료일은 시작일로부터 자동으로 1개월 후로 설정됩니다
                </p>
              </div>
            </div>

            {/* 에러 메시지 */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* 버튼 */}
            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? '수정 중...' : '수정 완료'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={loading}
              >
                취소
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
