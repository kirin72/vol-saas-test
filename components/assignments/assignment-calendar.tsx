/**
 * 배정 캘린더 컴포넌트
 * 월간 캘린더로 미사 일정 및 배정 완료율 시각화
 */
'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MassSchedule {
  id: string;
  date: string;
  time: string;
  massTemplate: {
    slots: Array<{
      requiredCount: number;
    }>;
  } | null;
  assignments: Array<{
    id: string;
  }>;
}

interface AssignmentCalendarProps {
  currentDate: Date;
  schedules: MassSchedule[];
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

export default function AssignmentCalendar({
  currentDate,
  schedules,
  selectedDate,
  onDateSelect,
  onPrevMonth,
  onNextMonth,
}: AssignmentCalendarProps) {
  // 해당 월의 날짜 배열 생성
  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // 첫째 날과 마지막 날
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // 첫째 날의 요일 (0 = 일요일)
    const firstDayOfWeek = firstDay.getDay();

    // 캘린더 시작일 (이전 달 날짜 포함)
    const calendarStart = new Date(firstDay);
    calendarStart.setDate(calendarStart.getDate() - firstDayOfWeek);

    // 6주 x 7일 = 42일 배열 생성
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

  // 특정 날짜의 배정 완료율 계산
  const getCompletionRate = (date: Date) => {
    const daySchedules = getSchedulesForDate(date);
    if (daySchedules.length === 0) return null;

    let totalRequired = 0;
    let totalAssigned = 0;

    daySchedules.forEach((schedule) => {
      if (schedule.massTemplate) {
        schedule.massTemplate.slots.forEach((slot) => {
          totalRequired += slot.requiredCount;
        });
        totalAssigned += schedule.assignments.length;
      }
    });

    if (totalRequired === 0) return null;

    const rate = (totalAssigned / totalRequired) * 100;
    return {
      rate,
      isComplete: rate >= 100,
      isPartial: rate > 0 && rate < 100,
      isEmpty: rate === 0,
    };
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
    <Card className="p-3 sm:p-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center mb-4 sm:mb-6">
        <Button variant="outline" size="sm" onClick={onPrevMonth} className="min-h-[44px]">
          <ChevronLeft className="h-4 w-4 sm:mr-1" />
          <span className="hidden sm:inline">이전 달</span>
        </Button>
        <h2 className="text-base sm:text-xl font-bold">
          {currentDate.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
          })}
        </h2>
        <Button variant="outline" size="sm" onClick={onNextMonth} className="min-h-[44px]">
          <span className="hidden sm:inline">다음 달</span>
          <ChevronRight className="h-4 w-4 sm:ml-1" />
        </Button>
      </div>

      {/* 범례 (모바일에서 축소) */}
      <div className="flex justify-center gap-2 sm:gap-4 mb-3 sm:mb-4 text-xs sm:text-sm">
        <div className="flex items-center gap-1 sm:gap-2">
          <div className="w-3 h-3 rounded bg-sky-100 border border-sky-200" />
          <span className="text-gray-600">완료</span>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <div className="w-3 h-3 rounded bg-yellow-50 border border-yellow-200" />
          <span className="text-gray-600">일부</span>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <div className="w-3 h-3 rounded bg-gray-200 border border-gray-300" />
          <span className="text-gray-600">미배정</span>
        </div>
      </div>

      {/* 캘린더 그리드 */}
      <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
        {/* 요일 헤더 */}
        {weekDays.map((day, index) => (
          <div
            key={day}
            className={`text-center font-semibold py-1 sm:py-2 text-xs sm:text-sm ${
              index === 0 ? 'text-red-600' : index === 6 ? 'text-blue-600' : 'text-gray-700'
            }`}
          >
            {day}
          </div>
        ))}

        {/* 날짜 셀 */}
        {calendarDays.map((date, index) => {
          const daySchedules = getSchedulesForDate(date);
          const completionRate = getCompletionRate(date);
          const isSelected = isSameDay(date, selectedDate);
          const isTodayDate = isToday(date);
          const isInCurrentMonth = isCurrentMonth(date);

          // 현재 월이 아닌 날짜는 빈 칸으로 표시
          if (!isInCurrentMonth) {
            return <div key={index} className="min-h-12 sm:min-h-20 p-1 sm:p-2 border border-transparent" />;
          }

          // 배경색 결정
          let bgColor = 'bg-white';
          if (completionRate) {
            if (completionRate.isComplete) {
              bgColor = 'bg-sky-100';
            } else if (completionRate.isPartial) {
              bgColor = 'bg-yellow-50';
            } else if (completionRate.isEmpty) {
              bgColor = 'bg-gray-200';
            }
          }

          return (
            <button
              key={index}
              onClick={() => onDateSelect(date)}
              disabled={daySchedules.length === 0}
              className={`
                min-h-12 sm:min-h-20 p-1 sm:p-2 border rounded-md sm:rounded-lg transition-all
                ${isSelected ? 'ring-2 ring-blue-500' : ''}
                ${daySchedules.length === 0 ? 'cursor-default bg-white' : `cursor-pointer hover:opacity-80 ${bgColor}`}
              `}
            >
              {/* 날짜 */}
              <div className="flex justify-between items-start">
                <span
                  className={`
                    text-xs sm:text-sm font-medium
                    ${index % 7 === 0 ? 'text-red-600' : ''}
                    ${index % 7 === 6 ? 'text-blue-600' : ''}
                    ${isTodayDate ? 'bg-blue-600 text-white rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-[10px] sm:text-sm' : ''}
                  `}
                >
                  {date.getDate()}
                </span>
              </div>

              {/* 미사 정보: 모바일에서는 도트, 데스크톱에서는 Badge */}
              {daySchedules.length > 0 && (
                <>
                  {/* 모바일: 색상 도트 */}
                  <div className="sm:hidden flex justify-center mt-1">
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      completionRate?.isComplete ? 'bg-sky-500' :
                      completionRate?.isPartial ? 'bg-yellow-500' : 'bg-gray-400'
                    }`} />
                  </div>
                  {/* 데스크톱: Badge */}
                  <div className="hidden sm:block mt-1">
                    <Badge variant="outline" className="text-xs">
                      {daySchedules.length}개 미사
                    </Badge>
                  </div>
                </>
              )}
            </button>
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
