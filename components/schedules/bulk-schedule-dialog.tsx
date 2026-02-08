/**
 * 요일별 일괄 미사 일정 추가 다이얼로그
 * 선택한 요일의 모든 날짜에 동일한 일정을 추가
 */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Calendar, Check } from 'lucide-react';
import { massTypeLabels } from '@/lib/validations/schedule';

interface BulkScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dayOfWeek: number; // 0(일요일) ~ 6(토요일)
  currentMonth: Date;
  onSuccess: () => void;
}

interface VolunteerRole {
  id: string;
  name: string;
  color: string;
}

// 요일 이름
const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

// 시간 옵션 생성
const generateTimeOptions = () => {
  const times: { value: string; label: string }[] = [];
  for (let hour = 6; hour <= 20; hour++) {
    const time00 = `${String(hour).padStart(2, '0')}:00`;
    const period = hour < 12 ? '오전' : '오후';
    const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    times.push({ value: time00, label: `${period} ${hour12}시` });

    if (hour < 20) {
      const time30 = `${String(hour).padStart(2, '0')}:30`;
      times.push({ value: time30, label: `${period} ${hour12}시 30분` });
    }
  }
  return times;
};

const timeOptions = generateTimeOptions();

// 유효성 검사 스키마
const bulkScheduleSchema = z.object({
  time: z.string().min(1, '시간을 선택해주세요'),
  massType: z.enum(['WEEKDAY', 'SATURDAY', 'SUNDAY', 'SPECIAL']),
  notes: z.string().optional(),
  requiredRoles: z.array(
    z.object({
      roleId: z.string().min(1, '역할을 선택해주세요'),
      count: z.number().min(1, '최소 1명 이상 필요합니다'),
    })
  ).min(1, '최소 1개 이상의 역할이 필요합니다'),
});

type BulkScheduleInput = z.infer<typeof bulkScheduleSchema>;

export default function BulkScheduleDialog({
  open,
  onOpenChange,
  dayOfWeek,
  currentMonth,
  onSuccess,
}: BulkScheduleDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [error, setError] = useState('');
  const [roles, setRoles] = useState<VolunteerRole[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BulkScheduleInput>({
    resolver: zodResolver(bulkScheduleSchema),
    defaultValues: {
      time: '10:00',
      massType: dayOfWeek === 0 ? 'SUNDAY' : dayOfWeek === 6 ? 'SATURDAY' : 'WEEKDAY',
      notes: '',
      requiredRoles: [],
    },
  });

  // 해당 요일의 모든 날짜 계산
  const getDatesForDayOfWeek = () => {
    const dates: Date[] = [];
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    // 해당 월의 첫날과 마지막날
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // 해당 월의 모든 날짜를 순회하며 요일이 일치하는 날짜 찾기
    for (let date = new Date(firstDay); date <= lastDay; date.setDate(date.getDate() + 1)) {
      if (date.getDay() === dayOfWeek) {
        dates.push(new Date(date));
      }
    }

    return dates;
  };

  const targetDates = getDatesForDayOfWeek();

  // 역할 목록 가져오기
  useEffect(() => {
    if (open) {
      fetchRoles();
      reset();
      setSelectedRoleIds([]);
    }
  }, [open, reset]);

  const fetchRoles = async () => {
    setLoadingRoles(true);
    try {
      const response = await fetch('/api/admin/roles');
      if (!response.ok) throw new Error('역할 조회 실패');
      const data = await response.json();
      const activeRoles = data.filter((r: any) => r.isActive);
      setRoles(activeRoles);

      // 역할이 없으면 역할 관리 페이지로 이동
      if (activeRoles.length === 0) {
        alert('역할을 먼저 등록해 주세요');
        onOpenChange(false);
        router.push('/admin/roles');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingRoles(false);
    }
  };

  // 역할 토글
  const toggleRole = (roleId: string) => {
    setSelectedRoleIds((prev) => {
      const newIds = prev.includes(roleId)
        ? prev.filter((id) => id !== roleId)
        : [...prev, roleId];

      // requiredRoles 업데이트
      setValue(
        'requiredRoles',
        newIds.map((id) => ({ roleId: id, count: 1 }))
      );

      return newIds;
    });
  };

  // 역할 인원 수 변경
  const updateRoleCount = (roleId: string, count: number) => {
    const currentRoles = watch('requiredRoles') || [];
    const updatedRoles = currentRoles.map((role) =>
      role.roleId === roleId ? { ...role, count } : role
    );
    setValue('requiredRoles', updatedRoles);
  };

  const onSubmit = async (data: BulkScheduleInput) => {
    setLoading(true);
    setError('');

    try {
      // 각 날짜에 대해 일정 생성
      const createPromises = targetDates.map(async (date) => {
        const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

        const response = await fetch('/api/admin/schedules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...data,
            date: dateString,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || '일정 생성 실패');
        }

        return response.json();
      });

      await Promise.all(createPromises);

      alert(`${dayNames[dayOfWeek]} 일정이 추가되었습니다.`);
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {dayNames[dayOfWeek]} 일정 추가
          </DialogTitle>
          <DialogDescription>
            모든 {dayNames[dayOfWeek]}에 동일한 미사 일정을 추가합니다.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* 시간 선택 */}
          <div className="space-y-2">
            <Label htmlFor="time">미사 시간</Label>
            <select
              id="time"
              {...register('time')}
              className="w-full px-3 py-2 border rounded-md"
            >
              {timeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {errors.time && (
              <p className="text-sm text-red-600">{errors.time.message}</p>
            )}
          </div>

          {/* 미사 종류 */}
          <div className="space-y-2">
            <Label htmlFor="massType">미사 종류</Label>
            <select
              id="massType"
              {...register('massType')}
              className="w-full px-3 py-2 border rounded-md"
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

          {/* 필요한 봉사 역할 */}
          <div className="space-y-2">
            <Label>필요한 봉사 역할</Label>
            {loadingRoles ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="space-y-3">
                {roles.map((role) => {
                  const isSelected = selectedRoleIds.includes(role.id);
                  const roleData = watch('requiredRoles')?.find((r) => r.roleId === role.id);

                  return (
                    <div
                      key={role.id}
                      className={`border rounded-lg p-3 transition-all ${
                        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => toggleRole(role.id)}
                          className="flex items-center gap-2 flex-1"
                        >
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                              isSelected
                                ? 'border-blue-500 bg-blue-500'
                                : 'border-gray-300'
                            }`}
                          >
                            {isSelected && <Check className="h-3 w-3 text-white" />}
                          </div>
                          <Badge
                            style={{
                              backgroundColor: role.color,
                              color: 'white',
                            }}
                          >
                            {role.name}
                          </Badge>
                        </button>

                        {isSelected && (
                          <div className="flex items-center gap-2">
                            <Label className="text-sm">인원:</Label>
                            <Input
                              type="number"
                              min="1"
                              max="10"
                              value={roleData?.count || 1}
                              onChange={(e) =>
                                updateRoleCount(role.id, parseInt(e.target.value) || 1)
                              }
                              className="w-16 h-8"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {errors.requiredRoles && (
              <p className="text-sm text-red-600">{errors.requiredRoles.message}</p>
            )}
          </div>

          {/* 메모 */}
          <div className="space-y-2">
            <Label htmlFor="notes">메모 (선택)</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="특별한 안내사항이 있으면 입력하세요"
              rows={3}
            />
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* 버튼 */}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              취소
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? '추가 중...' : '추가'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
