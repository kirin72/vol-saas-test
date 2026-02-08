/**
 * 미사 일정 캘린더 컴포넌트
 * 월간 캘린더로 미사 일정 시각화
 */
'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';

interface MassSchedule {
  id: string;
  date: string;
  time: string;
  notes: string | null;
  massTemplate: {
    id: string;
    massType: string;
    slots: Array<{
      requiredCount: number;
    }>;
  } | null;
  _count: {
    assignments: number;
  };
}

interface ScheduleCalendarProps {
  currentDate: Date;
  schedules: MassSchedule[];
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onAddSchedule?: (date: Date) => void;
}

// 미사 종류 레이블
const massTypeLabels: Record<string, string> = {
  WEEKDAY: '평일',
  SATURDAY: '토요일',
  SUNDAY: '주일',
  SPECIAL: '특전',
};

// 미사 종류 색상
const massTypeColors: Record<string, string> = {
  WEEKDAY: 'bg-gray-100 text-gray-700',
  SATURDAY: 'bg-blue-100 text-blue-700',
  SUNDAY: 'bg-purple-100 text-purple-700',
  SPECIAL: 'bg-orange-100 text-orange-700',
};

export default function ScheduleCalendar({
  currentDate,
  schedules,
  selectedDate,
  onDateSelect,
  onPrevMonth,
  onNextMonth,
  onAddSchedule,
}: ScheduleCalendarProps) {
  // 해당 월의 날짜 배열 생성 (42일: 6주 x 7일)
  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const firstDayOfWeek = firstDay.getDay();

    const calendarStart = new Date(firstDay);
    calendarStart.setDate(calendarStart.getDate() - firstDayOfWeek);

    const days: Date[] = [];
    const current = new Date(calendarStart);

    for (let i = 0; i < 42; i++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return days;
  };

  // 특정 날짜의 미사 목록 가져오기
  const getSchedulesForDate = (date: Date) => {
    return schedules.filter((s) => {
      const scheduleDate = new Date(s.date);
      return (
        scheduleDate.getFullYear() === date.getFullYear() &&
        scheduleDate.getMonth() === date.getMonth() &&
        scheduleDate.getDate() === date.getDate()
      );
    });
  };

  // 날짜가 같은지 비교
  const isSameDay = (date1: Date, date2: Date | null) => {
    if (!date2) return false;
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };

  // 오늘 날짜인지 확인
  const isToday = (date: Date) => {
    const today = new Date();
    return isSameDay(date, today);
  };

  // 현재 월에 속하는지 확인
  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  const calendarDays = generateCalendarDays();
  const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <Card className="p-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center mb-6">
        <Button variant="outline" size="sm" onClick={onPrevMonth}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          이전 달
        </Button>
        <h2 className="text-xl font-bold">
          {currentDate.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
          })}
        </h2>
        <Button variant="outline" size="sm" onClick={onNextMonth}>
          다음 달
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {/* 범례 */}
      <div className="flex justify-center gap-4 mb-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-purple-500" />
          <span className="text-gray-600">주일미사</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-blue-500" />
          <span className="text-gray-600">토요일미사</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-gray-500" />
          <span className="text-gray-600">평일미사</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-orange-500" />
          <span className="text-gray-600">특전미사</span>
        </div>
      </div>

      {/* 캘린더 그리드 */}
      <div className="grid grid-cols-7 gap-1">
        {/* 요일 헤더 */}
        {weekDays.map((day, index) => (
          <div
            key={day}
            className={`text-center font-semibold py-2 text-sm ${
              index === 0 ? 'text-red-600' : index === 6 ? 'text-blue-600' : 'text-gray-700'
            }`}
          >
            {day}
          </div>
        ))}

        {/* 날짜 셀 */}
        {calendarDays.map((date, index) => {
          const daySchedules = getSchedulesForDate(date);
          const isSelected = isSameDay(date, selectedDate);
          const isTodayDate = isToday(date);
          const isInCurrentMonth = isCurrentMonth(date);
          const hasNoSchedule = daySchedules.length === 0;

          // 현재 월이 아닌 날짜는 빈 칸으로 표시
          if (!isInCurrentMonth) {
            return <div key={index} className="min-h-24 p-2 border border-transparent" />;
          }

          return (
            <div
              key={index}
              className={`
                min-h-24 p-2 border rounded-lg transition-all flex flex-col justify-between
                ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''}
                ${hasNoSchedule ? 'bg-gray-100' : 'bg-white'}
                ${hasNoSchedule ? '' : 'hover:bg-gray-50 cursor-pointer'}
              `}
              onClick={hasNoSchedule ? undefined : () => onDateSelect(date)}
            >
              {/* 날짜 */}
              <div className="flex justify-between items-start mb-1">
                <span
                  className={`
                    text-sm font-medium
                    ${index % 7 === 0 ? 'text-red-600' : ''}
                    ${index % 7 === 6 ? 'text-blue-600' : ''}
                    ${isTodayDate ? 'bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center' : ''}
                  `}
                >
                  {date.getDate()}
                </span>
              </div>

              {/* 미사 개수 */}
              {daySchedules.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  {daySchedules.length}개 미사
                </Badge>
              )}

              {/* 일정 추가 버튼 */}
              {onAddSchedule && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddSchedule(date);
                  }}
                  className="mt-auto pt-1 text-gray-400 hover:text-blue-600 transition-colors flex items-center justify-center gap-1 text-xs"
                >
                  <Plus className="h-3 w-3" />
                  <span>추가</span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* 선택된 날짜 표시 */}
      {selectedDate && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm font-medium text-blue-900">
            선택된 날짜:{' '}
            {selectedDate.toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'long',
            })}
          </p>
        </div>
      )}
    </Card>
  );
}
