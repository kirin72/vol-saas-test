/**
 * 월 이동 네비게이터
 * 이전달/다음달 버튼 및 현재 년월 표시
 */
'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MonthNavigatorProps {
  year: number; // 현재 년도
  month: number; // 현재 월 (1-12)
  onMonthChange: (year: number, month: number) => void; // 월 변경 콜백
}

export function MonthNavigator({
  year,
  month,
  onMonthChange,
}: MonthNavigatorProps) {
  // 이전달 버튼 클릭 핸들러
  const handlePreviousMonth = () => {
    if (month === 1) {
      // 1월이면 전년 12월로 이동
      onMonthChange(year - 1, 12);
    } else {
      onMonthChange(year, month - 1);
    }
  };

  // 다음달 버튼 클릭 핸들러
  const handleNextMonth = () => {
    if (month === 12) {
      // 12월이면 다음년 1월로 이동
      onMonthChange(year + 1, 1);
    } else {
      onMonthChange(year, month + 1);
    }
  };

  return (
    <div className="flex items-center justify-center gap-4">
      {/* 이전달 버튼 */}
      <Button
        variant="outline"
        size="sm"
        onClick={handlePreviousMonth}
        className="flex items-center gap-1"
      >
        <ChevronLeft className="w-4 h-4" />
        <span>이전달</span>
      </Button>

      {/* 현재 년월 표시 */}
      <h2 className="text-xl font-bold text-gray-900">
        {year}년 {month}월
      </h2>

      {/* 다음달 버튼 */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleNextMonth}
        className="flex items-center gap-1"
      >
        <span>다음달</span>
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}
