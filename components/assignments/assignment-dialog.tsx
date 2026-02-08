/**
 * 봉사자 배정 다이얼로그
 * 특정 역할에 배정할 봉사자를 선택
 */
'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, User } from 'lucide-react';

interface AssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule: {
    id: string;
    date: string;
    time: string;
  };
  role: {
    roleId: string;
    roleName: string;
    roleColor: string;
  };
  onSuccess: () => void;
}

interface Volunteer {
  id: string;
  name: string;
  baptismalName: string | null;
  phone: string | null;
  assignmentCount?: number; // 이번 달 배정 횟수
}

export default function AssignmentDialog({
  open,
  onOpenChange,
  schedule,
  role,
  onSuccess,
}: AssignmentDialogProps) {
  const [loading, setLoading] = useState(false);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [filteredVolunteers, setFilteredVolunteers] = useState<Volunteer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVolunteer, setSelectedVolunteer] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // 다이얼로그 열릴 때 봉사자 목록 및 통계 조회
  useEffect(() => {
    if (open) {
      fetchVolunteersAndStats();
      setSearchQuery('');
      setSelectedVolunteer(null);
      setError('');
    }
  }, [open, role.roleId]);

  // 봉사자 목록 및 배정 통계 조회
  const fetchVolunteersAndStats = async () => {
    try {
      setLoading(true);

      // 현재 월 계산
      const scheduleDate = new Date(schedule.date);
      const currentMonth = `${scheduleDate.getFullYear()}-${String(scheduleDate.getMonth() + 1).padStart(2, '0')}`;

      // 1. 봉사자 목록 조회
      const volunteersRes = await fetch(`/api/admin/volunteers?roleId=${role.roleId}`);
      if (!volunteersRes.ok) throw new Error('봉사자 목록 조회 실패');
      const volunteersData = await volunteersRes.json();

      // 2. 배정 통계 조회
      const statsRes = await fetch(`/api/admin/assignments/stats?month=${currentMonth}`);
      if (!statsRes.ok) throw new Error('배정 통계 조회 실패');
      const statsData: Record<string, number> = await statsRes.json();

      // 3. 봉사자 목록에 배정 횟수 추가
      const volunteersWithStats = volunteersData.map((volunteer: any) => ({
        ...volunteer,
        assignmentCount: statsData[volunteer.id] || 0,
      }));

      // 4. 배정 횟수 적은 순으로 정렬 (공평 배정)
      volunteersWithStats.sort((a: Volunteer, b: Volunteer) => {
        const countA = a.assignmentCount || 0;
        const countB = b.assignmentCount || 0;
        if (countA !== countB) {
          return countA - countB; // 배정 횟수 적은 순
        }
        return a.name.localeCompare(b.name); // 같으면 이름순
      });

      setVolunteers(volunteersWithStats);
      setFilteredVolunteers(volunteersWithStats);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 검색 처리 (정렬 유지)
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredVolunteers(volunteers);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = volunteers.filter(
      (v) =>
        v.name.toLowerCase().includes(query) ||
        (v.baptismalName && v.baptismalName.toLowerCase().includes(query))
    );

    // 검색 결과도 배정 횟수 적은 순으로 정렬 유지
    filtered.sort((a, b) => {
      const countA = a.assignmentCount || 0;
      const countB = b.assignmentCount || 0;
      if (countA !== countB) {
        return countA - countB;
      }
      return a.name.localeCompare(b.name);
    });

    setFilteredVolunteers(filtered);
  }, [searchQuery, volunteers]);

  // 배정 저장
  const handleSubmit = async () => {
    if (!selectedVolunteer) {
      setError('봉사자를 선택해주세요');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/admin/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          massScheduleId: schedule.id,
          userId: selectedVolunteer,
          volunteerRoleId: role.roleId,
          status: 'ASSIGNED',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '배정 생성 실패');
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>봉사자 배정</DialogTitle>
          <DialogDescription>
            {new Date(schedule.date).toLocaleDateString('ko-KR', {
              month: 'long',
              day: 'numeric',
              weekday: 'short',
            })}{' '}
            {schedule.time} - {role.roleName}
          </DialogDescription>
          <p className="text-sm text-gray-500 mt-2">
            💡 배정 횟수가 적은 순으로 정렬되어 있습니다
          </p>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* 검색 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="이름 또는 세례명으로 검색"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* 봉사자 목록 */}
          <div className="flex-1 overflow-y-auto border rounded-md">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : filteredVolunteers.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">
                  {searchQuery
                    ? '검색 결과가 없습니다'
                    : '이 역할을 할 수 있는 봉사자가 없습니다'}
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredVolunteers.map((volunteer) => (
                  <button
                    key={volunteer.id}
                    onClick={() => setSelectedVolunteer(volunteer.id)}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                      selectedVolunteer === volunteer.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="font-medium text-sm">
                            {volunteer.name}
                            {volunteer.baptismalName && (
                              <span className="text-gray-500 ml-1">({volunteer.baptismalName})</span>
                            )}
                          </p>
                          {volunteer.phone && (
                            <p className="text-xs text-gray-500">{volunteer.phone}</p>
                          )}
                        </div>
                      </div>
                      {volunteer.assignmentCount !== undefined && (
                        <Badge
                          variant={
                            volunteer.assignmentCount === 0
                              ? 'default' // 파란색 (0회)
                              : volunteer.assignmentCount >= 3
                              ? 'destructive' // 빨간색 (3회 이상)
                              : 'secondary' // 회색 (1-2회)
                          }
                          className="text-xs"
                        >
                          {volunteer.assignmentCount === 0
                            ? '미배정 ⭐'
                            : `이번 달 ${volunteer.assignmentCount}회`}
                        </Badge>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* 버튼 */}
          <div className="flex gap-3">
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!selectedVolunteer || submitting}
              className="flex-1"
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {submitting ? '배정 중...' : '배정하기'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              취소
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
