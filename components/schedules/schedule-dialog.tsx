/**
 * 미사 일정 추가/수정 다이얼로그
 */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { scheduleCreateSchema, type ScheduleCreateInput, massTypeLabels } from '@/lib/validations/schedule';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

interface ScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule?: any | null;
  onSuccess: () => void;
  schedules?: any[];
}

interface VolunteerRole {
  id: string;
  name: string;
  color: string;
}

// 24시간 형식을 12시간 형식으로 변환 (예: "13:00" → "오후 1시")
const formatTime12Hour = (time24: string) => {
  const [hourStr, minute] = time24.split(':');
  const hour = parseInt(hourStr);

  const period = hour < 12 ? '오전' : '오후';
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;

  return `${period} ${hour12}시${minute === '30' ? ' 30분' : ''}`;
};

// 시간 옵션 생성 (06:00 ~ 20:00, 30분 단위)
const generateTimeOptions = () => {
  const times: { value: string; label: string }[] = [];
  for (let hour = 6; hour <= 20; hour++) {
    const time00 = `${String(hour).padStart(2, '0')}:00`;
    times.push({ value: time00, label: formatTime12Hour(time00) });

    if (hour < 20) {
      const time30 = `${String(hour).padStart(2, '0')}:30`;
      times.push({ value: time30, label: formatTime12Hour(time30) });
    }
  }
  return times;
};

const timeOptions = generateTimeOptions();

export default function ScheduleDialog({
  open,
  onOpenChange,
  schedule,
  onSuccess,
  schedules = [],
}: ScheduleDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [error, setError] = useState('');
  const [roles, setRoles] = useState<VolunteerRole[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);

  const isEditing = !!schedule?.id;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ScheduleCreateInput>({
    resolver: zodResolver(scheduleCreateSchema),
    defaultValues: {
      date: '',
      time: '10:00',
      massType: 'SUNDAY',
      notes: '',
      requiredRoles: [{ roleId: '', count: 1 }],
    },
  });

  // 역할 목록 가져오기
  useEffect(() => {
    async function fetchRoles() {
      try {
        setLoadingRoles(true);
        const res = await fetch('/api/admin/roles');
        if (res.ok) {
          const data = await res.json();
          const activeRoles = data.filter((r: any) => r.isActive);
          setRoles(activeRoles);

          // 역할이 없으면 역할 관리 페이지로 이동
          if (activeRoles.length === 0) {
            alert('역할을 먼저 등록해 주세요');
            onOpenChange(false);
            router.push('/admin/roles');
          }
        }
      } catch (error) {
        console.error('역할 목록 조회 실패:', error);
      } finally {
        setLoadingRoles(false);
      }
    }

    if (open) {
      fetchRoles();
    }
  }, [open, router, onOpenChange]);

  // 날짜 변경 시 같은 날짜의 기존 일정 메모 자동 입력
  const selectedDate = watch('date');
  useEffect(() => {
    if (selectedDate && schedules.length > 0 && !isEditing) {
      // 같은 날짜의 기존 일정 찾기
      const existingSchedule = schedules.find((s: any) => {
        const scheduleDate = new Date(s.date).toISOString().split('T')[0];
        return scheduleDate === selectedDate;
      });

      // 기존 일정이 있고 메모가 있으면 자동으로 채우기
      if (existingSchedule && existingSchedule.notes) {
        setValue('notes', existingSchedule.notes);
      }
    }
  }, [selectedDate, schedules, isEditing, setValue]);

  // 다이얼로그가 열릴 때 폼 초기화
  useEffect(() => {
    if (open) {
      if (schedule) {
        // 수정 모드 또는 날짜가 지정된 추가 모드
        const slots = schedule.massTemplate?.slots || [];

        reset({
          date: schedule.date ? new Date(schedule.date).toISOString().split('T')[0] : '',
          time: schedule.time || '10:00',
          massType: schedule.massTemplate?.massType || 'SUNDAY',
          notes: schedule.notes || '',
          requiredRoles: [],
        });

        // 선택된 역할 ID 설정
        if (slots.length > 0) {
          setSelectedRoleIds(slots.map((slot: any) => slot.volunteerRole.id));
        } else {
          setSelectedRoleIds([]);
        }
      } else {
        // 추가 모드
        reset({
          date: '',
          time: '10:00',
          massType: 'SUNDAY',
          notes: '',
          requiredRoles: [],
        });
        setSelectedRoleIds([]);
      }
      setError('');
    }
  }, [open, schedule, reset]);

  // 폼 제출
  const onSubmit = async (data: ScheduleCreateInput) => {
    // 선택된 역할 검증
    if (selectedRoleIds.length === 0) {
      setError('최소 1개 이상의 봉사 역할을 선택해주세요');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 선택된 역할 ID를 requiredRoles 형식으로 변환 (각 역할당 1명)
      const requiredRoles = selectedRoleIds.map((roleId) => ({
        roleId,
        count: 1,
      }));

      const submitData = {
        ...data,
        requiredRoles,
      };

      const url = isEditing
        ? `/api/admin/schedules/${schedule.id}`
        : '/api/admin/schedules';
      const method = isEditing ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      if (res.ok) {
        onSuccess();
      } else {
        const errorData = await res.json();
        setError(errorData.error || '일정 저장에 실패했습니다');
      }
    } catch (error) {
      console.error('일정 저장 오류:', error);
      setError('일정 저장 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? '미사 일정 수정' : '미사 일정 추가'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* 기본 정보 */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">기본 정보</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">날짜 *</Label>
                <Input
                  id="date"
                  type="date"
                  {...register('date')}
                  disabled={loading}
                />
                {errors.date && (
                  <p className="text-sm text-red-600">{errors.date.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="time">시간 *</Label>
                <select
                  id="time"
                  {...register('time')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                >
                  {timeOptions.map((time) => (
                    <option key={time.value} value={time.value}>
                      {time.label}
                    </option>
                  ))}
                </select>
                {errors.time && (
                  <p className="text-sm text-red-600">{errors.time.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="massType">미사 종류 *</Label>
              <select
                id="massType"
                {...register('massType')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                {Object.entries(massTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              {errors.massType && (
                <p className="text-sm text-red-600">{errors.massType.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">메모</Label>
              <Textarea
                id="notes"
                {...register('notes')}
                placeholder="특별한 안내사항이 있으면 입력하세요"
                rows={2}
                disabled={loading}
              />
            </div>
          </div>

          {/* 필요 역할 */}
          <div className="space-y-4 border-t pt-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                필요 봉사 역할 * <span className="text-xs text-gray-500 font-normal">(각 역할당 1명)</span>
              </h3>
            </div>

            {loadingRoles ? (
              <p className="text-sm text-gray-500">역할 목록 로딩 중...</p>
            ) : roles.length === 0 ? (
              <p className="text-sm text-red-600">
                먼저 봉사 역할을 생성해주세요
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {roles.map((role) => (
                  <label
                    key={role.id}
                    className={`
                      flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all
                      ${selectedRoleIds.includes(role.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                      }
                      ${loading ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    <input
                      type="checkbox"
                      checked={selectedRoleIds.includes(role.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedRoleIds([...selectedRoleIds, role.id]);
                        } else {
                          setSelectedRoleIds(selectedRoleIds.filter((id) => id !== role.id));
                        }
                      }}
                      disabled={loading}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <Badge
                      style={{
                        backgroundColor: role.color,
                        color: 'white',
                      }}
                    >
                      {role.name}
                    </Badge>
                  </label>
                ))}
              </div>
            )}
            {selectedRoleIds.length === 0 && (
              <p className="text-sm text-gray-500">
                필요한 봉사 역할을 선택해주세요
              </p>
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
              {loading ? '저장 중...' : '완료'}
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
