/**
 * 봉사자 대시보드
 * - 이번 달 참여 가능 여부 선택
 * - 선호 요일, 불가 요일, 불가 날짜 관리
 * - 배정된 봉사 일정 조회 (리스트/캘린더)
 * - 교체/삭제 요청
 */
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AvailabilityForm } from '@/components/volunteer/availability-form';
import { AssignmentList } from '@/components/volunteer/assignment-list';
import { Loader2, Calendar as CalendarIcon, List } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VolunteerInfo {
  availableThisMonth: boolean | null;
  preferredDays: number[] | null;
  unavailableDays: number[] | null;
  unavailableDates: string[] | null;
}

interface Assignment {
  id: string;
  massSchedule: {
    id: string;
    date: string;
    time: string;
    notes: string | null;
    massTemplate: {
      massType: string;
    };
  };
  volunteerRole: {
    id: string;
    name: string;
    color: string | null;
  };
  status: string;
}

export default function VolunteerDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [volunteerInfo, setVolunteerInfo] = useState<VolunteerInfo | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  // 현재 월
  const currentMonth = new Date().toISOString().slice(0, 7);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // 봉사자 정보 조회
      const infoRes = await fetch('/api/volunteer/info');
      if (infoRes.ok) {
        const data = await infoRes.json();
        setVolunteerInfo(data);
      }

      // 배정 조회
      const assignmentsRes = await fetch(`/api/volunteer/assignments?month=${currentMonth}`);
      if (assignmentsRes.ok) {
        const data = await assignmentsRes.json();
        setAssignments(data);
      }
    } catch (error) {
      console.error('데이터 조회 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 페이지 제목 */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">나의 봉사 현황</h1>
        <p className="text-gray-600 mt-2">
          이번 달 배정된 봉사 일정을 확인하고 관리하세요
        </p>
      </div>

      {/* 참여 가능 여부 및 선호 정보 */}
      <AvailabilityForm
        initialData={volunteerInfo}
        onUpdate={fetchData}
      />

      {/* 배정된 일정 */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>이번 달 배정 일정</CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                총 {assignments.length}개 배정
              </p>
            </div>

            {/* 뷰 모드 전환 */}
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4 mr-1" />
                리스트
              </Button>
              <Button
                variant={viewMode === 'calendar' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('calendar')}
              >
                <CalendarIcon className="h-4 w-4 mr-1" />
                캘린더
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* 자동배정 안내 문구 (배정이 있을 때만 표시) */}
          {assignments.length > 0 && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800 leading-relaxed">
                최근 봉사 기록과 선호 날짜를 고려하여{' '}
                <strong className="text-blue-900 font-bold">최대한 공평하게</strong>{' '}
                자동으로 배정되었습니다.
              </p>
              <p className="text-sm text-blue-700 mt-1">
                배정에 문제가 있거나 교체가 필요한 경우, 아래 일정의{' '}
                <strong>교체 요청</strong>으로 알려주세요.
              </p>
            </div>
          )}
          <AssignmentList
            assignments={assignments}
            viewMode={viewMode}
            onUpdate={fetchData}
          />
        </CardContent>
      </Card>
    </div>
  );
}
