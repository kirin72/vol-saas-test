/**
 * 미사 템플릿 추가/수정 다이얼로그
 * 템플릿 이름, 미사 종류, 반복 요일, 시간, 역할 설정
 */
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  templateCreateSchema,
  type TemplateCreateInput,
  dayOfWeekLabels,
  vestmentColorLabels,
  vestmentColorCodes,
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
  dayOfWeek: string | string[] | null;
  time: string;
  vestmentColor: string | null;
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

// 평일미사에서 선택 가능한 요일 (월~금)
const WEEKDAY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'MONDAY', label: '월' },
  { value: 'TUESDAY', label: '화' },
  { value: 'WEDNESDAY', label: '수' },
  { value: 'THURSDAY', label: '목' },
  { value: 'FRIDAY', label: '금' },
];

// 제의 색상 옵션
const VESTMENT_COLOR_OPTIONS = Object.entries(vestmentColorLabels).map(([value, label]) => ({
  value,
  label,
  color: vestmentColorCodes[value],
}));

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
  // 평일미사용 선택된 요일 배열
  const [selectedDays, setSelectedDays] = useState<string[]>([]);

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
      vestmentColor: null,
      slots: [],
    },
  });

  // 현재 선택된 미사 종류
  const currentMassType = watch('massType');

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
        // dayOfWeek가 배열인지 단일값인지 확인하여 배열로 변환
        const existingDays = template.dayOfWeek
          ? Array.isArray(template.dayOfWeek)
            ? template.dayOfWeek
            : [template.dayOfWeek]
          : [];

        reset({
          name: template.name,
          massType: template.massType as any,
          dayOfWeek: existingDays.length > 0 ? existingDays as any : null,
          time: template.time,
          vestmentColor: (template.vestmentColor as any) || null,
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
        setSelectedDays(existingDays);
      } else {
        // 추가 모드: 빈 값으로 초기화
        reset({
          name: '',
          massType: 'SUNDAY',
          dayOfWeek: null,
          time: '10:00',
          vestmentColor: null,
          slots: [],
        });
        setSelectedSlots({});
        setSelectedDays([]);
      }
      setError('');
    }
  }, [open, template, reset]);

  // 미사 종류 변경 시 요일 자동 설정
  useEffect(() => {
    if (currentMassType === 'SUNDAY') {
      // 주일미사: 자동으로 일요일 설정
      setSelectedDays(['SUNDAY']);
      setValue('dayOfWeek', ['SUNDAY']);
    } else if (currentMassType === 'SATURDAY') {
      // 특전미사: 자동으로 토요일 설정
      setSelectedDays(['SATURDAY']);
      setValue('dayOfWeek', ['SATURDAY']);
    } else if (currentMassType === 'WEEKDAY') {
      // 평일미사: 수정 모드가 아닌 경우 초기화
      if (!template) {
        setSelectedDays([]);
        setValue('dayOfWeek', null);
      }
    }
  }, [currentMassType, setValue, template]);

  // selectedDays 변경 시 폼의 dayOfWeek 필드 동기화
  useEffect(() => {
    if (currentMassType === 'WEEKDAY') {
      setValue('dayOfWeek', selectedDays.length > 0 ? selectedDays as any : null);
    }
  }, [selectedDays, currentMassType, setValue]);

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

  // selectedSlots가 변경될 때 폼의 slots 필드 동기화
  useEffect(() => {
    const slots = Object.entries(selectedSlots).map(([volunteerRoleId, requiredCount]) => ({
      volunteerRoleId,
      requiredCount,
    }));
    setValue('slots', slots);
  }, [selectedSlots, setValue]);

  // 평일미사 요일 체크박스 토글
  const handleDayToggle = (day: string, checked: boolean) => {
    setSelectedDays((prev) => {
      if (checked) {
        return [...prev, day].sort((a, b) => {
          const order = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
          return order.indexOf(a) - order.indexOf(b);
        });
      } else {
        return prev.filter((d) => d !== day);
      }
    });
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

    // 평일미사인데 요일 미선택 시 에러
    if (data.massType === 'WEEKDAY' && selectedDays.length === 0) {
      setError('평일미사는 최소 1개 이상의 요일을 선택해주세요');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const url = isEditing
        ? `/api/admin/templates/${template.id}`
        : '/api/admin/templates';
      const method = isEditing ? 'PATCH' : 'POST';

      // dayOfWeek 결정
      let dayOfWeek: string[] | null = null;
      if (data.massType === 'SUNDAY') {
        dayOfWeek = ['SUNDAY'];
      } else if (data.massType === 'SATURDAY') {
        dayOfWeek = ['SATURDAY'];
      } else if (data.massType === 'WEEKDAY') {
        dayOfWeek = selectedDays.length > 0 ? selectedDays : null;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          dayOfWeek,
          vestmentColor: data.vestmentColor || null,
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

  // 미사 종류 옵션 (순서: 주일미사, 평일미사, 특전미사)
  const massTypeOptions = Object.entries(massTypeLabels);

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
            <div className="grid grid-cols-3 gap-2">
              {massTypeOptions.map(([value, label]) => (
                <label
                  key={value}
                  className={`flex items-center justify-center gap-2 p-3 rounded-md border cursor-pointer transition-colors ${
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
            <p className="text-xs text-gray-500">
              대축일 및 특수목적 미사는 봉사일정관리에서 일정추가를 해주세요
            </p>
            {errors.massType && (
              <p className="text-sm text-red-600">{errors.massType.message}</p>
            )}
          </div>

          {/* 반복 요일 (평일미사일 때만 표시) */}
          {currentMassType === 'WEEKDAY' && (
            <div className="space-y-2">
              <Label>반복 요일 * (복수 선택 가능)</Label>
              <div className="flex gap-2">
                {WEEKDAY_OPTIONS.map(({ value, label }) => (
                  <label
                    key={value}
                    className={`flex items-center justify-center w-12 h-10 rounded-md border cursor-pointer transition-colors ${
                      selectedDays.includes(value)
                        ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={selectedDays.includes(value)}
                      onChange={(e) => handleDayToggle(value, e.target.checked)}
                      disabled={loading}
                    />
                    <span className="text-sm">{label}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-500">
                요일을 선택하면 월간 일정 자동 생성이 가능합니다
              </p>
            </div>
          )}

          {/* 시간 (30분 단위, 06:00~20:00) */}
          <div className="space-y-2">
            <Label htmlFor="time">미사 시간 *</Label>
            <select
              id="time"
              {...register('time')}
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            >
              {Array.from({ length: 29 }, (_, i) => {
                // 06:00부터 20:00까지 30분 단위 (29개 옵션)
                const totalMinutes = 6 * 60 + i * 30;
                const hour24 = Math.floor(totalMinutes / 60);
                const min = String(totalMinutes % 60).padStart(2, '0');
                // 저장용 값 (24시간 형식)
                const value = `${String(hour24).padStart(2, '0')}:${min}`;
                // 표시용 라벨 (오전/오후 12시간 형식)
                const period = hour24 < 12 ? '오전' : '오후';
                const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
                const label = `${period} ${hour12}:${min}`;
                return { value, label };
              }).map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            {errors.time && (
              <p className="text-sm text-red-600">{errors.time.message}</p>
            )}
          </div>

          {/* 제의 색상 (선택사항) */}
          <div className="space-y-2">
            <Label>제의 색상</Label>
            <div className="flex flex-wrap gap-2">
              {VESTMENT_COLOR_OPTIONS.map(({ value, label, color }) => {
                const isSelected = watch('vestmentColor') === value;
                // 백색은 테두리로 구분
                const isWhite = value === 'WHITE';
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      // 이미 선택된 색상 클릭 시 선택 해제
                      if (isSelected) {
                        setValue('vestmentColor', null as any);
                      } else {
                        setValue('vestmentColor', value as any);
                      }
                    }}
                    disabled={loading}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition-all ${
                      isSelected
                        ? 'ring-2 ring-blue-500 ring-offset-1 border-blue-400 font-semibold'
                        : 'border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    {/* 색상 원형 표시 */}
                    <span
                      className={`inline-block w-4 h-4 rounded-full shrink-0 ${
                        isWhite ? 'border border-gray-300' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-gray-500">
              선택하지 않아도 됩니다. 다시 클릭하면 선택이 해제됩니다.
            </p>
          </div>

          {/* 필요 역할 */}
          <div className="space-y-2">
            <Label>필요 역할 *</Label>
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
                    </div>
                  );
                })}
              </div>
            )}
            <p className="text-xs text-gray-500">
              2명 이상의 인원이 필요할때는 역할관리에서 추가해 주세요
            </p>
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
