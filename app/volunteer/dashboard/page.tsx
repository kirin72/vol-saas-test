/**
 * 봉사자 대시보드
 * - 이번 달 참여 가능 여부 선택
 * - 선호 요일, 불가 요일, 불가 날짜 관리
 * - 배정된 봉사 일정 조회 (리스트/캘린더)
 * - 교체/삭제 요청
 */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AvailabilityForm } from '@/components/volunteer/availability-form';
import { AssignmentList } from '@/components/volunteer/assignment-list';
import { InstallBanner } from '@/components/pwa/install-prompt';
import { Loader2, Calendar as CalendarIcon, List, Wallet, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { checkIsTreasurer } from '@/lib/actions/treasurer';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

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
  assignmentMethod: 'MANUAL' | 'AUTO'; // 배정 방법
}

export default function VolunteerDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [volunteerInfo, setVolunteerInfo] = useState<VolunteerInfo | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [isTreasurer, setIsTreasurer] = useState(false); // 총무 여부
  const [isAvailabilityOpen, setIsAvailabilityOpen] = useState(false); // 참여정보 펼침 상태

  // 현재 월
  const currentMonth = new Date().toISOString().slice(0, 7);

  // 참여정보가 한번이라도 입력되었는지 체크
  const hasAvailabilityData = (info: VolunteerInfo | null): boolean => {
    if (!info) return false;
    return Boolean(
      info.availableThisMonth !== null ||
      (info.preferredDays && info.preferredDays.length > 0) ||
      (info.unavailableDays && info.unavailableDays.length > 0) ||
      (info.unavailableDates && info.unavailableDates.length > 0)
    );
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // 봉사자 정보 + 총무 여부 + 배정 동시 조회
      const [infoRes, assignmentsRes, treasurerResult] = await Promise.all([
        fetch('/api/volunteer/info'),
        fetch(`/api/volunteer/assignments?month=${currentMonth}`),
        checkIsTreasurer(),
      ]);

      // 봉사자 정보 설정
      if (infoRes.ok) {
        const data = await infoRes.json();
        setVolunteerInfo(data);
      }

      // 배정 설정
      if (assignmentsRes.ok) {
        const data = await assignmentsRes.json();
        setAssignments(data);
      }

      // 총무 여부 설정
      setIsTreasurer(treasurerResult);
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

  // 참여정보가 한번이라도 입력되었는지
  const hasData = hasAvailabilityData(volunteerInfo);

  return (
    <div className="space-y-6">
      {/* PWA 설치 배너 (모바일에서 미설치 시 표시) */}
      <InstallBanner />

      {/* 페이지 제목 */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">나의 봉사 현황</h1>
        <p className="text-gray-600 mt-2">
          이번 달 배정된 봉사 일정을 확인하고 관리하세요
        </p>
      </div>

      {/* 총무: 입출금 관리 바로가기 */}
      {isTreasurer && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <Wallet className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-green-900">입출금 관리</p>
                <p className="text-sm text-green-700">총무로 지정되어 입출금 관리에 접근할 수 있습니다.</p>
              </div>
            </div>
            <Button asChild variant="outline" className="border-green-300 text-green-700 hover:bg-green-100">
              <Link href="/volunteer/finance">
                입출금 관리
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 참여 가능 여부 및 선호 정보 - 데이터가 없으면 위에 표시 */}
      {!hasData && (
        <AvailabilityForm
          initialData={volunteerInfo}
          onUpdate={fetchData}
        />
      )}

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
          {/* 자동배정 안내 문구 (자동배정된 항목이 있을 때만 표시) */}
          {assignments.some((a) => a.assignmentMethod === 'AUTO') && (
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

      {/* 참여 가능 여부 및 선호 정보 - 데이터가 있으면 아래에 접힌 상태로 표시 */}
      {hasData && (
        <Card>
          <Collapsible
            open={isAvailabilityOpen}
            onOpenChange={setIsAvailabilityOpen}
          >
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-2">
                    참여 정보
                    <span className="text-sm text-gray-500 font-normal">
                      (클릭하여 {isAvailabilityOpen ? '접기' : '펼치기'})
                    </span>
                  </CardTitle>
                  {isAvailabilityOpen ? (
                    <ChevronUp className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-500" />
                  )}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-6 pb-6">
                <AvailabilityForm
                  initialData={volunteerInfo}
                  onUpdate={fetchData}
                  hideCard
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}
    </div>
  );
}
