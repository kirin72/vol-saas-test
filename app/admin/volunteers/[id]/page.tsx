/**
 * 봉사자 상세/수정 페이지
 * React Hook Form + Zod 검증
 */
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { volunteerUpdateSchema, type VolunteerUpdateInput } from '@/lib/validations/volunteer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { DaySelector } from '@/components/volunteers/DaySelector';
import { ArrowLeft, Loader2, Trash2 } from 'lucide-react';
import Link from 'next/link';

// 역할 타입
interface VolunteerRole {
  id: string;
  name: string;
  color: string;
}

// 봉사자 타입
interface Volunteer {
  id: string;
  name: string;
  baptismalName: string | null;
  email: string;
  phone: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  hasPaidDues: boolean;
  availableThisMonth: boolean | null;
  preferredDays: number[] | null;
  unavailableDays: number[] | null;
  unavailableDates: string[] | null;
  userRoles: {
    volunteerRole: VolunteerRole;
  }[];
}

export default function VolunteerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const volunteerId = params.id as string;

  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [roles, setRoles] = useState<VolunteerRole[]>([]);
  const [volunteer, setVolunteer] = useState<Volunteer | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  // React Hook Form 설정
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<VolunteerUpdateInput>({
    resolver: zodResolver(volunteerUpdateSchema),
  });

  const selectedRoleIds = watch('roleIds') || [];

  // 봉사자 및 역할 데이터 가져오기
  useEffect(() => {
    async function fetchData() {
      try {
        // 봉사자 정보
        const volunteerRes = await fetch(`/api/admin/volunteers/${volunteerId}`);
        if (volunteerRes.ok) {
          const volunteerData = await volunteerRes.json();
          setVolunteer(volunteerData);

          // 폼 초기값 설정
          reset({
            name: volunteerData.name,
            baptismalName: volunteerData.baptismalName || '',
            email: volunteerData.email || '',
            phone: volunteerData.phone || '',
            password: '', // 비밀번호는 비워둠
            status: volunteerData.status,
            hasPaidDues: volunteerData.hasPaidDues ?? false,
            roleIds: volunteerData.userRoles.map((ur: any) => ur.volunteerRole.id),
            availableThisMonth: volunteerData.availableThisMonth ?? undefined,
            preferredDays: volunteerData.preferredDays || [],
            unavailableDays: volunteerData.unavailableDays || [],
            unavailableDates: volunteerData.unavailableDates || [],
          });
        }

        // 역할 목록
        const rolesRes = await fetch('/api/admin/roles');
        if (rolesRes.ok) {
          const rolesData = await rolesRes.json();
          setRoles(rolesData);
        }
      } catch (error) {
        console.error('데이터 로딩 실패:', error);
        setError('데이터를 불러오는 중 오류가 발생했습니다');
      } finally {
        setLoadingData(false);
      }
    }
    fetchData();
  }, [volunteerId, reset]);

  // 역할 선택/해제
  const toggleRole = (roleId: string) => {
    const currentRoleIds = selectedRoleIds;
    const newRoleIds = currentRoleIds.includes(roleId)
      ? currentRoleIds.filter((id) => id !== roleId)
      : [...currentRoleIds, roleId];
    setValue('roleIds', newRoleIds);
  };

  // 폼 제출 (수정)
  const onSubmit = async (data: VolunteerUpdateInput) => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/admin/volunteers/${volunteerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        router.push('/admin/volunteers');
        router.refresh();
      } else {
        const errorData = await res.json();
        setError(errorData.error || '봉사자 수정에 실패했습니다');
      }
    } catch (error) {
      console.error('봉사자 수정 오류:', error);
      setError('봉사자 수정 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  // 봉사자 삭제
  const handleDelete = async () => {
    if (!confirm('정말 이 봉사자를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) {
      return;
    }

    setDeleting(true);
    setError('');

    try {
      const res = await fetch(`/api/admin/volunteers/${volunteerId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        // 성공 시 목록 페이지로 이동하고 새로고침
        alert('봉사자가 삭제되었습니다');
        window.location.href = '/admin/volunteers'; // 강제 새로고침
      } else {
        const errorData = await res.json();
        setError(errorData.error || '봉사자 삭제에 실패했습니다');
        console.error('삭제 API 오류:', errorData);
      }
    } catch (error) {
      console.error('봉사자 삭제 오류:', error);
      setError('봉사자 삭제 중 오류가 발생했습니다');
    } finally {
      setDeleting(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!volunteer) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">봉사자를 찾을 수 없습니다</p>
            <Button asChild className="mt-4">
              <Link href="/admin/volunteers">목록으로 돌아가기</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* 뒤로가기 */}
      <Link
        href="/admin/volunteers"
        className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        봉사자 목록으로 돌아가기
      </Link>

      {/* 폼 카드 */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>봉사자 정보 수정</CardTitle>
              <CardDescription>
                {volunteer.name}
                {volunteer.baptismalName && ` (${volunteer.baptismalName})`}
              </CardDescription>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deleting || loading}
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* 이름 */}
            <div className="space-y-2">
              <Label htmlFor="name">이름 *</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="홍길동"
                disabled={loading}
              />
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            {/* 세례명 */}
            <div className="space-y-2">
              <Label htmlFor="baptismalName">세례명</Label>
              <Input
                id="baptismalName"
                {...register('baptismalName')}
                placeholder="요셉"
                disabled={loading}
              />
              {errors.baptismalName && (
                <p className="text-sm text-red-600">{errors.baptismalName.message}</p>
              )}
            </div>

            {/* 이메일 */}
            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                placeholder="volunteer@example.com"
                disabled={loading}
              />
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            {/* 전화번호 */}
            <div className="space-y-2">
              <Label htmlFor="phone">전화번호</Label>
              <Input
                id="phone"
                {...register('phone')}
                placeholder="010-1234-5678"
                disabled={loading}
              />
              {errors.phone && (
                <p className="text-sm text-red-600">{errors.phone.message}</p>
              )}
            </div>

            {/* 비밀번호 (선택사항) */}
            <div className="space-y-2">
              <Label htmlFor="password">
                비밀번호 (변경 시에만 입력)
              </Label>
              <Input
                id="password"
                type="password"
                {...register('password')}
                placeholder="비밀번호를 변경하려면 입력하세요"
                disabled={loading}
              />
              {errors.password && (
                <p className="text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            {/* 상태 */}
            <div className="space-y-2">
              <Label htmlFor="status">상태 *</Label>
              <select
                id="status"
                {...register('status')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                <option value="ACTIVE">활성</option>
                <option value="INACTIVE">비활성</option>
                <option value="PENDING">대기</option>
              </select>
              {errors.status && (
                <p className="text-sm text-red-600">{errors.status.message}</p>
              )}
            </div>

            {/* 회비 납부 여부 */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hasPaidDues"
                  checked={watch('hasPaidDues') ?? false}
                  onCheckedChange={(checked) => setValue('hasPaidDues', checked === true)}
                  disabled={loading}
                />
                <Label htmlFor="hasPaidDues" className="font-normal cursor-pointer">
                  회비 납부 완료
                </Label>
              </div>
            </div>

            {/* 봉사 역할 선택 */}
            <div className="space-y-2">
              <Label>봉사 역할 * (최소 1개 선택)</Label>
              {roles.length === 0 ? (
                <p className="text-sm text-red-600">
                  먼저 역할을 생성해주세요
                </p>
              ) : (
                <div className="space-y-2 border rounded-md p-4">
                  {roles.map((role) => (
                    <div key={role.id} className="flex items-center">
                      <Checkbox
                        id={`role-${role.id}`}
                        checked={selectedRoleIds.includes(role.id)}
                        onCheckedChange={() => toggleRole(role.id)}
                        disabled={loading}
                      />
                      <label
                        htmlFor={`role-${role.id}`}
                        className="ml-3 flex items-center cursor-pointer"
                      >
                        <span
                          className="px-2 py-1 rounded text-sm font-medium text-white"
                          style={{ backgroundColor: role.color }}
                        >
                          {role.name}
                        </span>
                      </label>
                    </div>
                  ))}
                </div>
              )}
              {errors.roleIds && (
                <p className="text-sm text-red-600">{errors.roleIds.message}</p>
              )}
            </div>

            {/* 구분선 */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                봉사 가능 정보
              </h3>
            </div>

            {/* 이번 달 참여 가능 여부 */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="availableThisMonth"
                  checked={watch('availableThisMonth') ?? false}
                  onCheckedChange={(checked) =>
                    setValue('availableThisMonth', checked === true)
                  }
                  disabled={loading}
                />
                <Label htmlFor="availableThisMonth" className="font-normal cursor-pointer">
                  이번 달 봉사 참여 가능
                </Label>
              </div>
            </div>

            {/* 선호 요일 */}
            <DaySelector
              label="선호 요일"
              value={watch('preferredDays') || []}
              onChange={(days) => setValue('preferredDays', days)}
              disabled={loading}
            />

            {/* 불가 요일 */}
            <DaySelector
              label="불가 요일"
              value={watch('unavailableDays') || []}
              onChange={(days) => setValue('unavailableDays', days)}
              disabled={loading}
            />

            {/* 에러 메시지 */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* 버튼 */}
            <div className="flex gap-4">
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
