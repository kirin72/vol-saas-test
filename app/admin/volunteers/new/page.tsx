/**
 * 봉사자 등록 페이지
 * React Hook Form + Zod 검증
 */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { volunteerCreateSchema, type VolunteerCreateInput } from '@/lib/validations/volunteer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

// 역할 타입
interface VolunteerRole {
  id: string;
  name: string;
  color: string;
}

export default function NewVolunteerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [roles, setRoles] = useState<VolunteerRole[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);

  // React Hook Form 설정
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<VolunteerCreateInput>({
    resolver: zodResolver(volunteerCreateSchema),
    defaultValues: {
      status: 'ACTIVE',
      roleIds: [],
    },
  });

  const selectedRoleIds = watch('roleIds') || [];

  // 역할 목록 가져오기
  useEffect(() => {
    async function fetchRoles() {
      try {
        const res = await fetch('/api/admin/roles');
        if (res.ok) {
          const data = await res.json();
          setRoles(data);
        }
      } catch (error) {
        console.error('역할 목록 조회 실패:', error);
      } finally {
        setLoadingRoles(false);
      }
    }
    fetchRoles();
  }, []);

  // 역할 선택/해제
  const toggleRole = (roleId: string) => {
    const currentRoleIds = selectedRoleIds;
    const newRoleIds = currentRoleIds.includes(roleId)
      ? currentRoleIds.filter((id) => id !== roleId)
      : [...currentRoleIds, roleId];
    setValue('roleIds', newRoleIds);
  };

  // 폼 제출 (동명이인 체크 포함)
  const onSubmit = async (formData: VolunteerCreateInput, forceDuplicate = false) => {
    setLoading(true);
    setError('');

    try {
      // validation transform이 처리하므로 그대로 전송
      const payload = {
        ...formData,
        forceDuplicate: Boolean(forceDuplicate),
      };

      console.log('Sending payload:', payload);

      const res = await fetch('/api/admin/volunteers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        router.push('/admin/volunteers');
        router.refresh();
      } else if (res.status === 409) {
        // 동명이인 경고
        const errorData = await res.json();

        if (errorData.error === 'DUPLICATE_NAME') {
          const confirmed = confirm(
            `${errorData.message}\n\n계속 등록하시겠습니까?`
          );

          if (confirmed) {
            // 사용자가 확인했으면 forceDuplicate 플래그로 재시도
            setLoading(false);
            await onSubmit(formData, true);
            return;
          }
        } else {
          setError(errorData.message || '등록에 실패했습니다');
        }
      } else {
        // 에러 응답 파싱
        const errorData = await res.json().catch(() => ({ error: '알 수 없는 오류' }));
        console.error('API 에러 응답:', errorData);

        // 상세 에러 메시지 표시
        if (errorData.details) {
          console.error('검증 오류 상세:', errorData.details);
          setError(`입력 오류: ${JSON.stringify(errorData.details)}`);
        } else {
          setError(errorData.error || '봉사자 등록에 실패했습니다');
        }
      }
    } catch (error) {
      console.error('봉사자 등록 오류 (catch):', error);
      setError(`봉사자 등록 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

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
          <CardTitle>새 봉사자 등록</CardTitle>
          <CardDescription>
            봉사자 정보를 입력하고 역할을 선택해주세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((data) => onSubmit(data, false))} className="space-y-6">
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

            {/* 비밀번호 */}
            <div className="space-y-2">
              <Label htmlFor="password">비밀번호 *</Label>
              <Input
                id="password"
                type="password"
                {...register('password')}
                placeholder="최소 4자 이상"
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

            {/* 봉사 역할 선택 */}
            <div className="space-y-2">
              <Label>봉사 역할 * (최소 1개 선택)</Label>
              {loadingRoles ? (
                <p className="text-sm text-gray-500">역할 목록 로딩 중...</p>
              ) : roles.length === 0 ? (
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
                {loading ? '등록 중...' : '봉사자 등록'}
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
