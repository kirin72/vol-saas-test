/**
 * 월간 일정 자동 생성 다이얼로그
 * 선택한 템플릿을 기반으로 특정 월의 모든 해당 요일에 일정을 자동 생성
 */
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CalendarPlus, CheckCircle } from 'lucide-react';
import { dayOfWeekLabels } from '@/lib/validations/template';
import { massTypeLabels } from '@/lib/validations/schedule';

// 템플릿 타입
interface TemplateData {
  id: string;
  name: string;
  massType: string;
  dayOfWeek: string | null;
  time: string;
  slots: Array<{
    requiredCount: number;
    volunteerRole: {
      id: string;
      name: string;
      color: string;
    };
  }>;
}

// 생성 결과 타입
interface GenerateResult {
  message: string;
  createdCount: number;
  skippedCount: number;
  totalDates: number;
}

interface GenerateSchedulesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: TemplateData | null;
  onSuccess: () => void;
}

export default function GenerateSchedulesDialog({
  open,
  onOpenChange,
  template,
  onSuccess,
}: GenerateSchedulesDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // 결과 표시
  const [result, setResult] = useState<GenerateResult | null>(null);

  // 현재 날짜 기준 연도/월
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  // 다이얼로그가 열릴 때 초기화
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setError('');
      setResult(null);
      // 다음 달로 기본 설정
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      setYear(nextMonth.getFullYear());
      setMonth(nextMonth.getMonth() + 1);
    }
    onOpenChange(isOpen);
  };

  // 월간 일정 생성 실행
  const handleGenerate = async () => {
    if (!template) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/admin/templates/generate-schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: template.id,
          year,
          month,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setResult(data);
      } else {
        setError(data.error || '일정 생성에 실패했습니다');
      }
    } catch (error) {
      console.error('월간 일정 생성 오류:', error);
      setError('일정 생성 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  // 완료 후 닫기
  const handleClose = () => {
    if (result && result.createdCount > 0) {
      onSuccess();
    }
    handleOpenChange(false);
  };

  // 이전/다음 달 이동
  const handlePrevMonth = () => {
    if (month === 1) {
      setYear(year - 1);
      setMonth(12);
    } else {
      setMonth(month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setYear(year + 1);
      setMonth(1);
    } else {
      setMonth(month + 1);
    }
  };

  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="h-5 w-5" />
            월간 일정 자동 생성
          </DialogTitle>
          <DialogDescription>
            템플릿을 기반으로 선택한 달의 일정을 자동 생성합니다
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 템플릿 정보 표시 */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <h3 className="font-medium text-sm text-gray-700">선택된 템플릿</h3>
            <div className="space-y-1">
              <p className="font-semibold">{template.name}</p>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Badge variant="outline">
                  {massTypeLabels[template.massType] || template.massType}
                </Badge>
                {template.dayOfWeek && (
                  <Badge variant="secondary">
                    매주 {dayOfWeekLabels[template.dayOfWeek]}
                  </Badge>
                )}
                <span>{template.time}</span>
              </div>
              {/* 역할 목록 */}
              <div className="flex flex-wrap gap-1 mt-2">
                {template.slots.map((slot) => (
                  <Badge
                    key={slot.volunteerRole.id}
                    style={{
                      backgroundColor: slot.volunteerRole.color,
                      color: 'white',
                    }}
                    className="text-xs"
                  >
                    {slot.volunteerRole.name} ×{slot.requiredCount}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* 반복 요일 미설정 경고 */}
          {!template.dayOfWeek && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm text-yellow-700">
              이 템플릿에 반복 요일이 설정되어 있지 않습니다.
              먼저 템플릿을 수정하여 요일을 설정해주세요.
            </div>
          )}

          {/* 월 선택 */}
          {template.dayOfWeek && !result && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">생성할 월 선택</Label>
              <div className="flex items-center justify-center gap-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handlePrevMonth}
                  disabled={loading}
                >
                  ◀
                </Button>
                <span className="text-lg font-semibold min-w-[140px] text-center">
                  {year}년 {month}월
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleNextMonth}
                  disabled={loading}
                >
                  ▶
                </Button>
              </div>
              <p className="text-xs text-gray-500 text-center">
                {year}년 {month}월의 모든{' '}
                <strong>{dayOfWeekLabels[template.dayOfWeek]}</strong>에 일정이
                생성됩니다
              </p>
            </div>
          )}

          {/* 생성 결과 */}
          {result && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4 space-y-2">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">생성 완료</span>
              </div>
              <p className="text-sm text-green-700">{result.message}</p>
              <div className="text-xs text-green-600 space-y-1">
                <p>전체 해당 날짜: {result.totalDates}개</p>
                <p>새로 생성: {result.createdCount}개</p>
                {result.skippedCount > 0 && (
                  <p>건너뜀 (중복): {result.skippedCount}개</p>
                )}
              </div>
            </div>
          )}

          {/* 에러 메시지 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* 버튼 */}
          <div className="flex gap-3 pt-2">
            {result ? (
              <Button onClick={handleClose} className="flex-1">
                확인
              </Button>
            ) : (
              <>
                <Button
                  onClick={handleGenerate}
                  disabled={loading || !template.dayOfWeek}
                  className="flex-1"
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {loading ? '생성 중...' : '일정 생성'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                  disabled={loading}
                >
                  취소
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Label 컴포넌트 (로컬)
function Label({ className, children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement> & { className?: string }) {
  return (
    <label className={className} {...props}>
      {children}
    </label>
  );
}
