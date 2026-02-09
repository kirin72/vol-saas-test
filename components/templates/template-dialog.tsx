/**
 * 미사 템플릿 추가/수정 다이얼로그
 * 템플릿 이름, 미사 종류, 반복 요일, 시간, 역할별 필요 인원 설정
 */
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  templateCreateSchema,
  type TemplateCreateInput,
  dayOfWeekLabels,
} from '@/lib/validations/template';
import { massTypeLabels } from '@/lib/validations/schedule';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';

// 역할 타입
interface VolunteerRole {
  id: string;
  name: string;
  color: string;
  isActive: boolean;
}

// 템플릿 타입 (수정 시 전달)
interface TemplateData {
  id: string;
  name: string;
  massType: string;
  dayOfWeek: string | null;
  time: string;
  isActive: boolean;
  slots: Array<{
    volunteerRoleId: string;
    requiredCount: number;
    volunteerRole: {
      id: string;
      name: string;
      color: string;
    };
  }>;
}

interface TemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: TemplateData | null;
  onSuccess: () => void;
}

export default function TemplateDialog({
  open,
  onOpenChange,
  template,
  onSuccess,
}: TemplateDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // 역할 목록
  const [roles, setRoles] = useState<VolunteerRole[]>([]);
  // 선택된 역할과 인원수
  const [selectedSlots, setSelectedSlots] = useState<Record<string, number>>({});

  const isEditing = !!template;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TemplateCreateInput>({
    resolver: zodResolver(templateCreateSchema),
    defaultValues: {
      name: '',
      massType: 'SUNDAY',
      dayOfWeek: null,
      time: '10:00',
      slots: [],
    },
  });

  // 역할 목록 가져오기
  useEffect(() => {
    if (open) {
      fetchRoles();
    }
  }, [open]);

  // 다이얼로그가 열릴 때 폼 초기화
  useEffect(() => {
    if (open) {
      if (template) {
        // 수정 모드: 기존 값으로 초기화
        reset({
          name: template.name,
          massType: template.massType as any,
          dayOfWeek: (template.dayOfWeek as any) || null,
          time: template.time,
          slots: template.slots.map((s) => ({
            volunteerRoleId: s.volunteerRoleId,
            requiredCount: s.requiredCount,
          })),
        });
        // 선택된 슬롯 초기화
        const slotsMap: Record<string, number> = {};
        template.slots.forEach((s) => {
          slotsMap[s.volunteerRoleId] = s.requiredCount;
        });
        setSelectedSlots(slotsMap);
      } else {
        // 추가 모드: 빈 값으로 초기화
        reset({
          name: '',
          massType: 'SUNDAY',
          dayOfWeek: null,
          time: '10:00',
          slots: [],
        });
        setSelectedSlots({});
      }
      setError('');
    }
  }, [open, template, reset]);

  // 역할 목록 API 호출
  const fetchRoles = async () => {
    try {
      const response = await fetch('/api/admin/roles');
      if (response.ok) {
        const data = await response.json();
        // 활성 역할만 필터링
        setRoles(data.filter((r: VolunteerRole) => r.isActive));
      }
    } catch (err) {
      console.error('역할 목록 조회 실패:', err);
    }
  };

  // 역할 체크박스 토글
  const handleRoleToggle = (roleId: string, checked: boolean) => {
    setSelectedSlots((prev) => {
      const next = { ...prev };
      if (checked) {
        // 체크: 기본 1명으로 추가
        next[roleId] = 1;
      } else {
        // 체크 해제: 삭제
        delete next[roleId];
      }
      return next;
    });
  };

  // 인원수 변경
  const handleCountChange = (roleId: string, count: number) => {
    if (count < 1) return;
    setSelectedSlots((prev) => ({
      ...prev,
      [roleId]: count,
    }));
  };

  // 폼 제출
  const onSubmit = async (data: TemplateCreateInput) => {
    // 슬롯 데이터를 폼 데이터에 반영
    const slots = Object.entries(selectedSlots).map(([volunteerRoleId, requiredCount]) => ({
      volunteerRoleId,
      requiredCount,
    }));

    if (slots.length === 0) {
      setError('최소 1개 이상의 역할을 선택해주세요');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const url = isEditing
        ? `/api/admin/templates/${template.id}`
        : '/api/admin/templates';
      const method = isEditing ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          dayOfWeek: data.dayOfWeek || null,
          slots,
        }),
      });

      if (res.ok) {
        onSuccess();
      } else {
        const errorData = await res.json();
        setError(errorData.error || '템플릿 저장에 실패했습니다');
      }
    } catch (error) {
      console.error('템플릿 저장 오류:', error);
      setError('템플릿 저장 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  // 미사 종류 옵션
  const massTypeOptions = Object.entries(massTypeLabels);
  // 요일 옵션
  const dayOfWeekOptions = Object.entries(dayOfWeekLabels);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? '템플릿 수정' : '새 미사 템플릿 추가'}
          </DialogTitle>
          <DialogDescription>
            반복되는 미사 일정의 템플릿을 설정하세요
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* 템플릿 이름 */}
          <div className="space-y-2">
            <Label htmlFor="name">템플릿 이름 *</Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="예: 주일 오전 10시 미사"
              disabled={loading}
            />
            {errors.name && (
              <p className="text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          {/* 미사 종류 */}
          <div className="space-y-2">
            <Label>미사 종류 *</Label>
            <div className="grid grid-cols-2 gap-2">
              {massTypeOptions.map(([value, label]) => (
                <label
                  key={value}
                  className={`flex items-center gap-2 p-3 rounded-md border cursor-pointer transition-colors ${
                    watch('massType') === value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    value={value}
                    {...register('massType')}
                    className="sr-only"
                    disabled={loading}
                  />
                  <span className="text-sm font-medium">{label}</span>
                </label>
              ))}
            </div>
            {errors.massType && (
              <p className="text-sm text-red-600">{errors.massType.message}</p>
            )}
          </div>

          {/* 반복 요일 */}
          <div className="space-y-2">
            <Label htmlFor="dayOfWeek">반복 요일</Label>
            <select
              id="dayOfWeek"
              {...register('dayOfWeek')}
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            >
              <option value="">선택 안 함 (일회성)</option>
              {dayOfWeekOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500">
              요일을 선택하면 월간 일정 자동 생성이 가능합니다
            </p>
          </div>

          {/* 시간 */}
          <div className="space-y-2">
            <Label htmlFor="time">미사 시간 *</Label>
            <Input
              id="time"
              type="time"
              {...register('time')}
              disabled={loading}
            />
            {errors.time && (
              <p className="text-sm text-red-600">{errors.time.message}</p>
            )}
          </div>

          {/* 역할별 필요 인원 */}
          <div className="space-y-2">
            <Label>필요 역할 및 인원 *</Label>
            {roles.length === 0 ? (
              <p className="text-sm text-gray-500 py-2">
                등록된 역할이 없습니다. 먼저 역할을 추가해주세요.
              </p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-3">
                {roles.map((role) => {
                  const roleId = role.id;
                  const checked = selectedSlots[roleId] !== undefined;

                  return (
                    <div
                      key={role.id}
                      className="flex items-center gap-3 py-1.5"
                    >
                      {/* 역할 선택 체크박스 */}
                      <Checkbox
                        id={`role-${role.id}`}
                        checked={checked}
                        onCheckedChange={(val) =>
                          handleRoleToggle(role.id, val === true)
                        }
                        disabled={loading}
                      />
                      {/* 역할 이름 (색상 뱃지) */}
                      <label
                        htmlFor={`role-${role.id}`}
                        className="flex-1 flex items-center gap-2 cursor-pointer"
                      >
                        <span
                          className="inline-block w-3 h-3 rounded-full"
                          style={{ backgroundColor: role.color }}
                        />
                        <span className="text-sm">{role.name}</span>
                      </label>
                      {/* 인원수 입력 (선택 시에만 표시) */}
                      {checked && (
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() =>
                              handleCountChange(role.id, (selectedSlots[role.id] || 1) - 1)
                            }
                            disabled={loading || (selectedSlots[role.id] || 1) <= 1}
                          >
                            -
                          </Button>
                          <span className="w-8 text-center text-sm font-medium">
                            {selectedSlots[role.id] || 1}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() =>
                              handleCountChange(role.id, (selectedSlots[role.id] || 1) + 1)
                            }
                            disabled={loading}
                          >
                            +
                          </Button>
                          <span className="text-xs text-gray-500 ml-1">명</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {errors.slots && (
              <p className="text-sm text-red-600">{errors.slots.message}</p>
            )}
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* 버튼 */}
          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? '저장 중...' : isEditing ? '수정' : '추가'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              취소
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
