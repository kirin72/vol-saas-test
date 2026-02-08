/**
 * 참여 가능 여부 및 선호 정보 폼
 * - 이번 달 참여 가능 여부
 * - 선호 요일, 불가 요일
 * - 이번 달 불가 날짜
 */
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar, Edit2, Plus, X } from 'lucide-react';

interface AvailabilityFormProps {
  initialData: {
    availableThisMonth: boolean | null;
    preferredDays: number[] | null;
    unavailableDays: number[] | null;
    unavailableDates: string[] | null;
  } | null;
  onUpdate: () => void;
}

const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

export function AvailabilityForm({ initialData, onUpdate }: AvailabilityFormProps) {
  const [saving, setSaving] = useState(false);

  // 폼 상태
  const [availableThisMonth, setAvailableThisMonth] = useState<boolean | null>(
    initialData?.availableThisMonth ?? null
  );
  const [preferredDays, setPreferredDays] = useState<number[]>(
    initialData?.preferredDays || []
  );
  const [unavailableDays, setUnavailableDays] = useState<number[]>(
    initialData?.unavailableDays || []
  );
  const [unavailableDates, setUnavailableDates] = useState<string[]>(
    initialData?.unavailableDates || []
  );

  // 날짜 입력 상태
  const [newDate, setNewDate] = useState('');

  const handleSave = async () => {
    setSaving(true);

    try {
      const res = await fetch('/api/volunteer/info', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          availableThisMonth,
          preferredDays,
          unavailableDays,
          unavailableDates,
        }),
      });

      if (res.ok) {
        alert('참여 정보가 저장되었습니다');
        onUpdate();
      } else {
        alert('저장 실패');
      }
    } catch (error) {
      console.error('저장 오류:', error);
      alert('저장 중 오류가 발생했습니다');
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (day: number, type: 'preferred' | 'unavailable') => {
    if (type === 'preferred') {
      if (preferredDays.includes(day)) {
        setPreferredDays(preferredDays.filter((d) => d !== day));
      } else {
        setPreferredDays([...preferredDays, day]);
      }
    } else {
      if (unavailableDays.includes(day)) {
        setUnavailableDays(unavailableDays.filter((d) => d !== day));
      } else {
        setUnavailableDays([...unavailableDays, day]);
      }
    }
  };

  const addUnavailableDate = () => {
    if (newDate && !unavailableDates.includes(newDate)) {
      setUnavailableDates([...unavailableDates, newDate].sort());
      setNewDate('');
    }
  };

  const removeUnavailableDate = (date: string) => {
    setUnavailableDates(unavailableDates.filter((d) => d !== date));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>참여 정보</CardTitle>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? '저장 중...' : '적용'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 이번 달 참여 가능 여부 */}
        <div>
          <Label className="text-base font-semibold mb-3 block">
            이번 달 참여 가능 여부
          </Label>
          <RadioGroup
            value={availableThisMonth === null ? 'null' : availableThisMonth.toString()}
            onValueChange={(value) =>
              setAvailableThisMonth(value === 'null' ? null : value === 'true')
            }
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="true" id="available-yes" />
              <Label htmlFor="available-yes" className="font-normal cursor-pointer">
                참여 가능
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="false" id="available-no" />
              <Label htmlFor="available-no" className="font-normal cursor-pointer">
                참여 불가
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* 선호 요일 */}
        <div>
          <Label className="text-base font-semibold mb-3 block">
            선호 요일
            <span className="text-xs text-gray-500 font-normal ml-2">
              (클릭하여 선택/해제)
            </span>
          </Label>
          <div className="flex flex-wrap gap-2">
            {dayNames.map((name, index) => {
              const isSelected = preferredDays.includes(index);
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => toggleDay(index, 'preferred')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-md scale-105'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105'
                  }`}
                >
                  {name}요일
                </button>
              );
            })}
          </div>
        </div>

        {/* 불가 요일 */}
        <div>
          <Label className="text-base font-semibold mb-3 block">
            불가 요일
            <span className="text-xs text-gray-500 font-normal ml-2">
              (클릭하여 선택/해제)
            </span>
          </Label>
          <div className="flex flex-wrap gap-2">
            {dayNames.map((name, index) => {
              const isSelected = unavailableDays.includes(index);
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => toggleDay(index, 'unavailable')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-red-600 text-white shadow-md scale-105'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105'
                  }`}
                >
                  {name}요일
                </button>
              );
            })}
          </div>
        </div>

        {/* 이번 달 불가 날짜 */}
        <div>
          <Label className="text-base font-semibold mb-3 block">
            이번 달 불가 날짜
          </Label>

          <div className="flex gap-2 mb-3">
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
            />
            <Button
              type="button"
              onClick={addUnavailableDate}
              disabled={!newDate}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              추가
            </Button>
          </div>

          {unavailableDates.length === 0 ? (
            <p className="text-sm text-gray-500">없음</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {unavailableDates.map((date) => (
                <Badge
                  key={date}
                  variant="secondary"
                  className="px-3 py-1.5"
                >
                  <Calendar className="h-3 w-3 mr-1" />
                  {new Date(date).toLocaleDateString('ko-KR', {
                    month: 'long',
                    day: 'numeric',
                  })}
                  <button
                    type="button"
                    onClick={() => removeUnavailableDate(date)}
                    className="ml-2 hover:text-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
