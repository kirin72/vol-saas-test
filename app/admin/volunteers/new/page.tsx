/**
 * 봉사자 등록 페이지
 * React Hook Form + Zod 검증
 */
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
  isActive: boolean;
}

export default function NewVolunteerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [roles, setRoles] = useState<VolunteerRole[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  // 전화번호 중복 체크 상태
  const [phoneDuplicateMsg, setPhoneDuplicateMsg] = useState('');
  const phoneCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // 전화번호 자동 포맷 (숫자만 입력해도 000-0000-0000 형식으로 변환)
  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11); // 숫자만, 최대 11자리
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  };

  // 전화번호 중복 체크 (디바운스 적용)
  const checkPhoneDuplicate = useCallback(async (phone: string) => {
    // 포맷된 전화번호가 최소 12자리(000-0000-0000) 이상이면 체크
    if (phone.replace(/\D/g, '').length < 10) {
      setPhoneDuplicateMsg('');
      return;
    }
    try {
      const res = await fetch(`/api/admin/volunteers/check-phone?phone=${encodeURIComponent(phone)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.duplicate) {
          setPhoneDuplicateMsg(`해당 번호는 ${data.volunteerName}봉사자님의 번호로 이미 등록된 번호입니다.`);
        } else {
          setPhoneDuplicateMsg('');
        }
      }
    } catch {
      // 네트워크 오류 시 무시
    }
  }, []);

  // 전화번호 입력 핸들러 (포맷 + 중복 체크)
  const handlePhoneChange = (value: string) => {
    const formatted = formatPhone(value);
    setValue('phone', formatted);
    // 기존 타이머 취소 후 500ms 디바운스로 중복 체크
    if (phoneCheckTimer.current) clearTimeout(phoneCheckTimer.current);
    phoneCheckTimer.current = setTimeout(() => {
      checkPhoneDuplicate(formatted);
    }, 500);
  };

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

  // 활성 역할만 필터링
  const activeRoles = roles.filter((r) => r.isActive);

  // 활성 역할이 없으면 안내 메시지 후 역할 관리 페이지로 이동
  useEffect(() => {
    if (!loadingRoles && activeRoles.length === 0) {
      alert('활성화된 역할이 없습니다. 역할을 먼저 등록/활성화해 주세요!');
      router.push('/admin/roles');
    }
  }, [loadingRoles, activeRoles.length, router]);

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
      // 비밀번호 미입력 시 전화번호 010 제외 뒷 8자리로 자동 생성
      let password = formData.password;
      if (!password) {
        const phoneDigits = (formData.phone || '').replace(/\D/g, '');
        if (phoneDigits.length >= 11) {
          password = phoneDigits.slice(3);
        } else {
          setError('비밀번호를 입력하거나 전화번호를 먼저 입력해주세요');
          setLoading(false);
          return;
        }
      }

      const payload = {
        ...formData,
        password,
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

            {/* 성별 */}
            <div className="space-y-2">
              <Label htmlFor="gender">성별</Label>
              <select
                id="gender"
                {...register('gender')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                <option value="">선택 안함</option>
                <option value="MALE">남성</option>
                <option value="FEMALE">여성</option>
              </select>
            </div>

            {/* 전화번호 (숫자만 입력해도 자동 포맷 + 중복 체크) */}
            <div className="space-y-2">
              <Label htmlFor="phone">전화번호</Label>
              <Input
                id="phone"
                inputMode="numeric"
                value={watch('phone') || ''}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="01012345678"
                disabled={loading}
              />
              {phoneDuplicateMsg && (
                <p className="text-sm text-orange-600">{phoneDuplicateMsg}</p>
              )}
              {errors.phone && (
                <p className="text-sm text-red-600">{errors.phone.message}</p>
              )}
            </div>

            {/* 비밀번호 안내 (등록 시 자동 생성, 수정은 개별 페이지에서) */}
            <p className="text-xs text-gray-500">
              봉사자 개별 로그인 비밀번호는 휴대폰 번호 뒷 8자리 입니다.
            </p>

            {/* 봉사 역할 선택 */}
            <div className="space-y-2">
              <Label>봉사 역할 * (최소 1개 선택)</Label>
              {loadingRoles ? (
                <p className="text-sm text-gray-500">역할 목록 로딩 중...</p>
              ) : activeRoles.length === 0 ? (
                <p className="text-sm text-red-600">
                  활성화된 역할이 없습니다. 역할 관리에서 역할을 활성화해주세요.
                </p>
              ) : (
                <div className="space-y-2 border rounded-md p-4">
                  {activeRoles.map((role) => (
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
