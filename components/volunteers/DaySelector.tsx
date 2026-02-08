/**
 * 요일 선택 컴포넌트
 * 선호 요일/불가 요일 선택에 사용
 */
'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface DaySelectorProps {
  value: number[]; // 선택된 요일 배열 (0: 일요일 ~ 6: 토요일)
  onChange: (days: number[]) => void; // 선택 변경 콜백
  label: string; // 라벨 텍스트
  disabled?: boolean; // 비활성화 여부
}

// 요일 정보
const WEEKDAYS = [
  { value: 0, label: '일' },
  { value: 1, label: '월' },
  { value: 2, label: '화' },
  { value: 3, label: '수' },
  { value: 4, label: '목' },
  { value: 5, label: '금' },
  { value: 6, label: '토' },
];

export function DaySelector({
  value = [],
  onChange,
  label,
  disabled = false,
}: DaySelectorProps) {
  // 요일 토글 핸들러
  const toggleDay = (dayValue: number) => {
    const newDays = value.includes(dayValue)
      ? value.filter((d) => d !== dayValue)
      : [...value, dayValue].sort((a, b) => a - b);
    onChange(newDays);
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2 flex-wrap">
        {WEEKDAYS.map((day) => (
          <div
            key={day.value}
            className={`
              flex items-center justify-center
              w-10 h-10 rounded-md border-2 cursor-pointer
              transition-colors
              ${
                value.includes(day.value)
                  ? 'bg-blue-500 border-blue-500 text-white'
                  : 'bg-white border-gray-300 text-gray-700 hover:border-blue-300'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            onClick={() => !disabled && toggleDay(day.value)}
          >
            <span className="text-sm font-medium">{day.label}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-500">
        선택된 요일: {value.length === 0 ? '없음' : value.map(d => WEEKDAYS[d].label).join(', ')}
      </p>
    </div>
  );
}
