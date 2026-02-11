/**
 * 미사 일정 페이지
 * 일요일~토요일 요일별 미사 시간을 설정하고
 * 저장 시 템플릿 + 12개월 일정을 자동 생성
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Save, Plus, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';

// 요일 목록 (일~토 순서)
const DAYS = [
  { key: 'SUNDAY', label: '일요일', shortLabel: '주일' },
  { key: 'MONDAY', label: '월요일', shortLabel: '월' },
  { key: 'TUESDAY', label: '화요일', shortLabel: '화' },
  { key: 'WEDNESDAY', label: '수요일', shortLabel: '수' },
  { key: 'THURSDAY', label: '목요일', shortLabel: '목' },
  { key: 'FRIDAY', label: '금요일', shortLabel: '금' },
  { key: 'SATURDAY', label: '토요일', shortLabel: '토' },
] as const;

// 오전 시간 옵션 (5:00 ~ 11:30, 30분 간격)
const AM_TIMES = Array.from({ length: 14 }, (_, i) => {
  const hour = Math.floor(i / 2) + 5; // 5시부터 시작
  const min = (i % 2) * 30;
  return `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
});

// 오후 시간 옵션 (12:00 ~ 20:30, 30분 간격)
const PM_TIMES = Array.from({ length: 18 }, (_, i) => {
  const hour = Math.floor(i / 2) + 12; // 12시부터 시작
  const min = (i % 2) * 30;
  return `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
});

// 단일 미사시간 타입
interface MassTimeEntry {
  period: 'AM' | 'PM'; // 오전/오후
  time: string; // "HH:mm" 형식
}

// 요일별 미사시간 상태 타입
type DayMassTimes = Record<string, MassTimeEntry[]>;

// 봉사 역할 타입
interface VolunteerRole {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
}

// 요일별 선택된 역할 ID
type DaySelectedRoles = Record<string, string[]>;

export default function MassTimesPage() {
  // 요일별 미사시간 상태
  const [dayMassTimes, setDayMassTimes] = useState<DayMassTimes>({
    SUNDAY: [],
    MONDAY: [],
    TUESDAY: [],
    WEDNESDAY: [],
    THURSDAY: [],
    FRIDAY: [],
    SATURDAY: [],
  });

  // 활성 봉사 역할 목록
  const [roles, setRoles] = useState<VolunteerRole[]>([]);
  // 요일별 선택된 역할 ID
  const [daySelectedRoles, setDaySelectedRoles] = useState<DaySelectedRoles>({
    SUNDAY: [], MONDAY: [], TUESDAY: [], WEDNESDAY: [],
    THURSDAY: [], FRIDAY: [], SATURDAY: [],
  });

  // UI 상태
  const [loading, setLoading] = useState(true); // 초기 로딩
  const [saving, setSaving] = useState(false); // 저장 중
  const [source, setSource] = useState<string>(''); // 데이터 출처
  const [error, setError] = useState(''); // 에러 메시지
  const [successMessage, setSuccessMessage] = useState(''); // 성공 메시지

  // 시간 문자열을 표시 형식으로 변환 (예: "10:00" → "오전 10:00")
  const formatTimeDisplay = (time: string): string => {
    const hour = parseInt(time.split(':')[0]);
    const min = time.split(':')[1];
    if (hour < 12) {
      return `오전 ${hour}:${min}`;
    } else if (hour === 12) {
      return `오후 12:${min}`;
    } else {
      return `오후 ${hour - 12}:${min}`;
    }
  };

  // 초기 데이터 로드 (미사시간 + 역할 동시 조회)
  const fetchMassTimes = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      // 미사시간과 역할 목록 동시 조회
      const [massTimesRes, rolesRes] = await Promise.all([
        fetch('/api/admin/mass-times'),
        fetch('/api/admin/roles'),
      ]);

      // 활성 역할 목록 처리
      let activeRoles: VolunteerRole[] = [];
      if (rolesRes.ok) {
        const rolesData = await rolesRes.json();
        activeRoles = rolesData
          .filter((r: any) => r.isActive)
          .sort((a: any, b: any) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999));
        setRoles(activeRoles);
      }

      // 미사시간 데이터 처리
      if (!massTimesRes.ok) throw new Error('미사시간 조회 실패');
      const data = await massTimesRes.json();

      setSource(data.source);

      // 서버에서 받은 요일별 미사시간 적용
      if (data.days) {
        const newDayMassTimes: DayMassTimes = {
          SUNDAY: [],
          MONDAY: [],
          TUESDAY: [],
          WEDNESDAY: [],
          THURSDAY: [],
          FRIDAY: [],
          SATURDAY: [],
        };

        for (const [day, times] of Object.entries(data.days)) {
          if (Array.isArray(times) && times.length > 0) {
            newDayMassTimes[day] = (times as MassTimeEntry[]).map((t) => ({
              period: t.period as 'AM' | 'PM',
              time: t.time,
            }));
          }
        }

        setDayMassTimes(newDayMassTimes);
      }

      // 요일별 선택된 역할 초기화
      if (data.dayRoles && Object.values(data.dayRoles).some((arr: any) => arr.length > 0)) {
        // 서버에서 기존 역할 정보가 있으면 사용
        setDaySelectedRoles(data.dayRoles);
      } else {
        // 없으면 모든 요일에 모든 활성 역할 선택
        const allRoleIds = activeRoles.map((r) => r.id);
        const initial: DaySelectedRoles = {};
        for (const day of ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']) {
          initial[day] = [...allRoleIds];
        }
        setDaySelectedRoles(initial);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMassTimes();
  }, [fetchMassTimes]);

  // 미사시간 추가 (특정 요일에 새 시간 추가)
  const addMassTime = (day: string) => {
    setDayMassTimes((prev) => {
      const current = prev[day] || [];
      if (current.length >= 5) return prev; // 최대 5개
      return {
        ...prev,
        [day]: [
          ...current,
          { period: 'AM' as const, time: AM_TIMES[5] }, // 기본값: 오전 7:30
        ],
      };
    });
  };

  // 미사시간 삭제
  const removeMassTime = (day: string, index: number) => {
    setDayMassTimes((prev) => ({
      ...prev,
      [day]: prev[day].filter((_, i) => i !== index),
    }));
  };

  // 오전/오후 변경
  const changePeriod = (day: string, index: number, period: 'AM' | 'PM') => {
    setDayMassTimes((prev) => {
      const updated = [...prev[day]];
      const oldTime = updated[index].time;
      const oldHour = parseInt(oldTime.split(':')[0]);
      const timeOptions = period === 'AM' ? AM_TIMES : PM_TIMES;

      // 현재 시간이 새 기간의 범위에 없으면 기본값으로 변경
      if (!timeOptions.includes(oldTime)) {
        updated[index] = { period, time: timeOptions[0] };
      } else {
        updated[index] = { ...updated[index], period };
      }

      return { ...prev, [day]: updated };
    });
  };

  // 요일별 역할 선택/해제 토글
  const toggleDayRole = (day: string, roleId: string) => {
    setDaySelectedRoles((prev) => {
      const current = prev[day] || [];
      if (current.includes(roleId)) {
        // 선택 해제
        return { ...prev, [day]: current.filter((id) => id !== roleId) };
      } else {
        // 선택
        return { ...prev, [day]: [...current, roleId] };
      }
    });
  };

  // 시간 변경
  const changeTime = (day: string, index: number, time: string) => {
    setDayMassTimes((prev) => {
      const updated = [...prev[day]];
      updated[index] = { ...updated[index], time };
      return { ...prev, [day]: updated };
    });
  };

  // 저장
  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccessMessage('');

      const response = await fetch('/api/admin/mass-times', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: dayMassTimes, dayRoles: daySelectedRoles }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '저장 실패');
      }

      const result = await response.json();
      setSuccessMessage(result.message);
      setSource('templates'); // 저장 후 소스를 templates로 변경
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // 전체 미사시간 수 계산
  const totalMassTimes = Object.values(dayMassTimes).reduce(
    (sum, times) => sum + times.length,
    0
  );

  // 로딩 상태
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">미사 일정</h1>
          <p className="text-gray-600 mt-2">
          요일별 미사 시간과 봉사 역할을 설정해주세요.<br>설정이 끝나면 <strong>저장</strong>버튼을 눌러주세요.</br>
          </p>
        </div>
        {/* 저장 버튼 */}
        <Button
          onClick={handleSave}
          disabled={saving || totalMassTimes === 0}
          className="shrink-0"
          size="lg"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {saving ? '저장 중...' : '저장'}
        </Button>
      </div>

      {/* 안내 배너 */}
      {source === 'churchDirectory' && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4 text-sm text-green-700 flex items-start gap-2">
          <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">성당 디렉토리에서 미사시간이 자동으로 불러와졌습니다.</p>
            <p className="mt-1">
              불러온 시간은 동절기 기준입니다. 하절기에는 시간이 다를 수 있으니
              본당 사정에 맞게 수정한 후 저장해 주세요.
            </p>
          </div>
        </div>
      )}

      {source === 'templates' && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4 text-sm text-blue-700 flex items-start gap-2">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p>
              기존에 저장된 미사 템플릿에서 시간을 불러왔습니다.
              수정 후 저장하면 기존 템플릿과 일정이 모두 재생성됩니다.
            </p>
          </div>
        </div>
      )}

      {/* 에러 메시지 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* 성공 메시지 */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4 text-sm text-green-700 flex items-start gap-2">
          <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* 요일별 미사시간 입력 */}
      <div className="grid gap-4">
        {DAYS.map(({ key, label, shortLabel }) => {
          const times = dayMassTimes[key] || [];
          const isSunday = key === 'SUNDAY';
          const isSaturday = key === 'SATURDAY';

          return (
            <Card
              key={key}
              className={
                isSunday
                  ? 'border-red-200 bg-red-50/30'
                  : isSaturday
                  ? 'border-blue-200 bg-blue-50/30'
                  : ''
              }
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {/* 요일 색상 표시 */}
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isSunday
                          ? 'bg-red-500'
                          : isSaturday
                          ? 'bg-blue-500'
                          : 'bg-gray-400'
                      }`}
                    />
                    {label}
                    {/* 미사 횟수 */}
                    {times.length > 0 && (
                      <span className="text-sm font-normal text-gray-500">
                        ({times.length}회)
                      </span>
                    )}
                  </CardTitle>

                  {/* 미사시간 추가 버튼 */}
                  {times.length < 5 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addMassTime(key)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      추가
                    </Button>
                  )}
                </div>
              </CardHeader>

              <CardContent>
                {times.length === 0 ? (
                  <p className="text-sm text-gray-400">
                    미사 시간이 없습니다. &apos;추가&apos; 버튼을 클릭하세요.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {times.map((entry, index) => {
                      // 현재 기간에 맞는 시간 옵션
                      const timeOptions =
                        entry.period === 'AM' ? AM_TIMES : PM_TIMES;

                      return (
                        <div
                          key={index}
                          className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap"
                        >
                          {/* 순번 */}
                          <span className="text-sm text-gray-500 w-6 text-center shrink-0">
                            {index + 1}
                          </span>

                          {/* 오전/오후 선택 */}
                          <div className="flex rounded-md border border-gray-300 overflow-hidden shrink-0">
                            <button
                              type="button"
                              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                                entry.period === 'AM'
                                  ? 'bg-amber-500 text-white'
                                  : 'bg-white text-gray-600 hover:bg-gray-50'
                              }`}
                              onClick={() => changePeriod(key, index, 'AM')}
                            >
                              오전
                            </button>
                            <button
                              type="button"
                              className={`px-3 py-1.5 text-sm font-medium transition-colors border-l border-gray-300 ${
                                entry.period === 'PM'
                                  ? 'bg-indigo-500 text-white'
                                  : 'bg-white text-gray-600 hover:bg-gray-50'
                              }`}
                              onClick={() => changePeriod(key, index, 'PM')}
                            >
                              오후
                            </button>
                          </div>

                          {/* 시간 선택 */}
                          <select
                            value={entry.time}
                            onChange={(e) =>
                              changeTime(key, index, e.target.value)
                            }
                            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[100px]"
                          >
                            {timeOptions.map((t) => (
                              <option key={t} value={t}>
                                {formatTimeDisplay(t)}
                              </option>
                            ))}
                          </select>

                          {/* 삭제 버튼 */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeMassTime(key, index)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 봉사 역할 선택 토글 버튼 */}
                {times.length > 0 && roles.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex flex-wrap gap-2">
                      {roles.map((role) => {
                        // 이 요일에서 해당 역할이 선택되어 있는지 확인
                        const isSelected = (daySelectedRoles[key] || []).includes(role.id);
                        return (
                          <button
                            key={role.id}
                            type="button"
                            onClick={() => toggleDayRole(key, role.id)}
                            className={`
                              px-3 py-1.5 rounded-full text-xs font-medium transition-all border
                              ${isSelected
                                ? 'text-white border-transparent shadow-sm'
                                : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                              }
                            `}
                            style={isSelected ? { backgroundColor: role.color } : {}}
                          >
                            {role.name}
                          </button>
                        );
                      })}
                    </div>
                    {/* 선택된 역할 수 표시 */}
                    <p className="text-xs text-gray-500 mt-2">
                      선택된 봉사 역할 {(daySelectedRoles[key] || []).length}개
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 안내 사항 */}
      <div className="bg-gray-50 border border-gray-200 rounded-md p-4 text-sm text-gray-600 space-y-2">
        <p className="font-medium text-gray-700">안내 사항</p>
        <ul className="list-disc list-inside space-y-1">
          <li>각 요일에 최대 5개의 미사 시간을 설정할 수 있습니다.</li>
          <li>저장하면 기존 미사 템플릿과 일정이 모두 삭제되고 새로 생성됩니다.</li>
          <li>생성된 일정은 오늘부터 12개월 간의 모든 해당 요일에 자동 적용됩니다.</li>
          <li>동절기/하절기 시간이 다른 경우, 계절 변경 시 이 페이지에서 수정해 주세요.</li>
        </ul>
      </div>

      {/* 하단 저장 버튼 */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving || totalMassTimes === 0}
          size="lg"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {saving ? '저장 중...' : `저장 (총 ${totalMassTimes}개 미사시간)`}
        </Button>
      </div>
    </div>
  );
}
