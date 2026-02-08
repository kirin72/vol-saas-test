/**
 * 봉사자 배정 관리 페이지
 * 월별 미사 일정 조회 및 봉사자 배정/해제
 */
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Loader2, X, UserPlus, Calendar, List, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import AssignmentDialog from '@/components/assignments/assignment-dialog';
import AssignmentCalendar from '@/components/assignments/assignment-calendar';

// 미사 일정 타입
interface MassSchedule {
  id: string;
  date: string;
  time: string;
  notes: string | null;
  massTemplate: {
    id: string;
    massType: string;
    slots: Array<{
      id: string;
      requiredCount: number;
      volunteerRole: {
        id: string;
        name: string;
        color: string;
      };
    }>;
  } | null;
  assignments: Array<{
    id: string;
    userId: string;
    volunteerRoleId: string;
    status: string;
    user: {
      id: string;
      name: string;
      baptismalName: string | null;
    };
    volunteerRole: {
      id: string;
      name: string;
      color: string;
    };
  }>;
}

// 미사 종류 한글 레이블
const massTypeLabels: Record<string, string> = {
  WEEKDAY: '평일미사',
  SATURDAY: '토요일미사',
  SUNDAY: '주일미사',
  SPECIAL: '특전미사',
};

export default function AssignmentsPage() {
  const [schedules, setSchedules] = useState<MassSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  // 뷰 모드 (calendar / list)
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  // 다이얼로그 상태
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<MassSchedule | null>(null);
  const [selectedRole, setSelectedRole] = useState<{
    roleId: string;
    roleName: string;
    roleColor: string;
  } | null>(null);

  // 자동배정 안내 다이얼로그 상태
  const [autoAssignDialogOpen, setAutoAssignDialogOpen] = useState(false);

  // 월 선택
  const [currentDate, setCurrentDate] = useState(new Date());
  const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

  // 캘린더에서 선택된 날짜
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    fetchAssignments();
  }, [currentMonth]);

  // 배정 목록 조회
  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/assignments?month=${currentMonth}`);
      if (!response.ok) throw new Error('배정 조회 실패');
      const data = await response.json();
      setSchedules(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 이전 달
  const handlePrevMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setCurrentDate(newDate);
  };

  // 다음 달
  const handleNextMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setCurrentDate(newDate);
  };

  // 배정 추가 다이얼로그 열기
  const handleAddAssignment = (schedule: MassSchedule, roleId: string, roleName: string, roleColor: string) => {
    setSelectedSchedule(schedule);
    setSelectedRole({ roleId, roleName, roleColor });
    setDialogOpen(true);
  };

  // 배정 삭제
  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!confirm('이 배정을 삭제하시겠습니까?')) {
      return;
    }

    setDeleting(assignmentId);

    try {
      const response = await fetch(`/api/admin/assignments/${assignmentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '배정 삭제 실패');
      }

      alert('배정이 삭제되었습니다');
      fetchAssignments();
    } catch (err: any) {
      alert(`삭제 오류: ${err.message}`);
    } finally {
      setDeleting(null);
    }
  };

  // 다이얼로그 저장 완료
  const handleDialogSuccess = () => {
    setDialogOpen(false);
    setSelectedSchedule(null);
    setSelectedRole(null);
    fetchAssignments();
  };

  // 날짜 포맷
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      month: 'long',
      day: 'numeric',
      weekday: 'short',
    });
  };

  // 역할별 배정 현황 계산
  const getAssignmentStatus = (schedule: MassSchedule, roleId: string) => {
    const slot = schedule.massTemplate?.slots.find((s) => s.volunteerRole.id === roleId);
    const requiredCount = slot?.requiredCount || 0;
    const assignedCount = schedule.assignments.filter((a) => a.volunteerRoleId === roleId).length;
    return { requiredCount, assignedCount, isFull: assignedCount >= requiredCount };
  };

  // 날짜 필터링된 일정 목록
  const filteredSchedules = selectedDate
    ? schedules.filter((schedule) => {
        const scheduleDate = new Date(schedule.date);
        return (
          scheduleDate.getFullYear() === selectedDate.getFullYear() &&
          scheduleDate.getMonth() === selectedDate.getMonth() &&
          scheduleDate.getDate() === selectedDate.getDate()
        );
      })
    : schedules;

  // 날짜 선택 핸들러
  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setViewMode('list'); // 날짜 선택 시 리스트 뷰로 전환
  };

  // 전체 보기
  const handleShowAll = () => {
    setSelectedDate(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">봉사자 배정</h1>
          <p className="text-gray-600 mt-2">
            {currentDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })} · 총 {schedules.length}개 일정
            {selectedDate && (
              <span className="ml-2">
                · 선택: {selectedDate.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })} ({filteredSchedules.length}개)
              </span>
            )}
          </p>
        </div>

        {/* 뷰 모드 전환 버튼 + 자동배정 버튼 */}
        <div className="flex gap-3 flex-shrink-0">
          {/* 자동배정 버튼 (눈에 잘 띄게) */}
          <Button
            size="default"
            onClick={() => setAutoAssignDialogOpen(true)}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold shadow-lg"
          >
            <Sparkles className="h-5 w-5 mr-2" />
            자동배정
          </Button>

          {/* 뷰 모드 전환 */}
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'calendar' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('calendar')}
            >
              <Calendar className="h-4 w-4 mr-1" />
              캘린더
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4 mr-1" />
              리스트
            </Button>
          </div>
        </div>
      </div>

      {/* 캘린더 뷰 */}
      {viewMode === 'calendar' && (
        <AssignmentCalendar
          currentDate={currentDate}
          schedules={schedules}
          selectedDate={selectedDate}
          onDateSelect={handleDateSelect}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
        />
      )}

      {/* 리스트 뷰 */}
      {viewMode === 'list' && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>
                  {selectedDate
                    ? selectedDate.toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        weekday: 'long',
                      })
                    : currentDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })}
                </CardTitle>
                {selectedDate && (
                  <Button
                    variant="link"
                    size="sm"
                    onClick={handleShowAll}
                    className="mt-1 p-0 h-auto text-blue-600"
                  >
                    전체 보기 →
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                {!selectedDate && (
                  <>
                    <Button variant="outline" size="sm" onClick={handlePrevMonth}>
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      이전 달
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleNextMonth}>
                      다음 달
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredSchedules.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">
                  {selectedDate ? '이 날짜에 일정이 없습니다' : '이번 달 일정이 없습니다'}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {filteredSchedules.map((schedule) => {
                const totalRequired = schedule.massTemplate?.slots.reduce((sum, slot) => sum + slot.requiredCount, 0) || 0;
                const totalAssigned = schedule.assignments.length;
                const isFullyAssigned = totalAssigned >= totalRequired;

                return (
                  <Card key={schedule.id} className="border-2">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-semibold">
                            {formatDate(schedule.date)} {schedule.time}
                          </h3>
                          <div className="flex gap-2 mt-2">
                            <Badge variant="outline">
                              {massTypeLabels[schedule.massTemplate?.massType || 'WEEKDAY']}
                            </Badge>
                            <Badge variant={isFullyAssigned ? 'default' : 'secondary'}>
                              배정: {totalAssigned}/{totalRequired}명
                            </Badge>
                          </div>
                          {schedule.notes && (
                            <p className="text-sm text-gray-500 mt-1">{schedule.notes}</p>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* 역할별 배정 현황 */}
                      {schedule.massTemplate?.slots.map((slot) => {
                        const { requiredCount, assignedCount, isFull } = getAssignmentStatus(schedule, slot.volunteerRole.id);
                        const roleAssignments = schedule.assignments.filter(
                          (a) => a.volunteerRoleId === slot.volunteerRole.id
                        );

                        return (
                          <div
                            key={slot.id}
                            className={`border rounded-lg p-4 ${
                              isFull ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'
                            }`}
                          >
                            <div className="flex justify-between items-center mb-3">
                              <div className="flex items-center gap-2">
                                <Badge
                                  style={{
                                    backgroundColor: slot.volunteerRole.color,
                                    color: 'white',
                                  }}
                                >
                                  {slot.volunteerRole.name}
                                </Badge>
                                <span className="text-sm font-medium">
                                  {assignedCount}/{requiredCount}명
                                </span>
                              </div>
                              {!isFull && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    handleAddAssignment(
                                      schedule,
                                      slot.volunteerRole.id,
                                      slot.volunteerRole.name,
                                      slot.volunteerRole.color
                                    )
                                  }
                                >
                                  <UserPlus className="h-4 w-4 mr-1" />
                                  배정 추가
                                </Button>
                              )}
                            </div>

                            {/* 배정된 봉사자 목록 */}
                            {roleAssignments.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {roleAssignments.map((assignment) => (
                                  <div
                                    key={assignment.id}
                                    className="flex items-center gap-1 bg-white border rounded-md px-3 py-1"
                                  >
                                    <span className="text-sm">
                                      {assignment.user.name}
                                      {assignment.user.baptismalName && ` (${assignment.user.baptismalName})`}
                                    </span>
                                    <button
                                      onClick={() => handleDeleteAssignment(assignment.id)}
                                      disabled={deleting === assignment.id}
                                      className="ml-1 text-red-600 hover:text-red-800 disabled:opacity-50"
                                    >
                                      {deleting === assignment.id ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <X className="h-3 w-3" />
                                      )}
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* 미배정 상태 */}
                            {roleAssignments.length === 0 && (
                              <p className="text-sm text-gray-500">아직 배정된 봉사자가 없습니다</p>
                            )}
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 배정 추가 다이얼로그 */}
      {selectedSchedule && selectedRole && (
        <AssignmentDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          schedule={selectedSchedule}
          role={selectedRole}
          onSuccess={handleDialogSuccess}
        />
      )}

      {/* 자동배정 안내 다이얼로그 */}
      <Dialog open={autoAssignDialogOpen} onOpenChange={setAutoAssignDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Sparkles className="h-6 w-6 text-purple-600" />
              자동배정 기능 안내
            </DialogTitle>
            <DialogDescription className="sr-only">
              자동배정 기능 상세 안내
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* 안내 메시지 */}
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="h-6 w-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                    1
                  </div>
                </div>
                <p className="text-gray-700">
                  지난 배정 기록 + 불참자 + 선호요일을 고려해 가장 공평하게 자동으로 배정합니다
                </p>
              </div>

              <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="h-6 w-6 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-bold">
                    2
                  </div>
                </div>
                <p className="text-gray-700">
                  자동 배치후 손쉽게 수정 할 수 있습니다.
                </p>
              </div>

              <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="h-6 w-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-bold">
                    PRO
                  </div>
                </div>
                <p className="text-gray-700 font-medium">
                  자동배정 기능은 PRO 이용자에게만 제공되고 있습니다.
                </p>
              </div>
            </div>

            {/* CTA 버튼 */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setAutoAssignDialogOpen(false)}
              >
                닫기
              </Button>
              <Button
                className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                onClick={() => {
                  setAutoAssignDialogOpen(false);
                  alert('PRO 플랜 업그레이드 페이지로 이동합니다 (준비 중)');
                }}
              >
                PRO 업그레이드
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
