/**
 * 관리자 본인의 봉사 현황 페이지
 * - 이번 달 배정 일정만 표시 (참여가능여부, 선호요일, 불가날짜 없음)
 * - 교체/삭제 요청 버튼 없음 (readOnly 모드)
 */
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AssignmentList } from '@/components/volunteer/assignment-list';
import { Loader2, Calendar as CalendarIcon, List } from 'lucide-react';
import { Button } from '@/components/ui/button';

// 배정 타입
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

export default function AdminMyAssignmentsPage() {
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  // 현재 월
  const currentMonth = new Date().toISOString().slice(0, 7);

  useEffect(() => {
    fetchAssignments();
  }, []);

  // 배정 목록 조회
  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/my-assignments?month=${currentMonth}`);
      if (res.ok) {
        const data = await res.json();
        setAssignments(data);
      }
    } catch (error) {
      console.error('배정 조회 오류:', error);
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
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">나의 봉사 현황</h1>
        <p className="text-gray-600 mt-2">
          이번 달 배정된 봉사 일정을 확인하세요
        </p>
      </div>

      {/* 배정 일정 */}
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
          {/* readOnly 모드로 교체/삭제 요청 버튼 숨김 */}
          <AssignmentList
            assignments={assignments}
            viewMode={viewMode}
            onUpdate={fetchAssignments}
            readOnly
          />
        </CardContent>
      </Card>
    </div>
  );
}
