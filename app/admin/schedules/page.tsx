/**
 * 봉사 일정 관리 페이지
 */
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Edit, Trash2, Loader2, ChevronLeft, ChevronRight, Calendar, List } from 'lucide-react';
import ScheduleDialog from '@/components/schedules/schedule-dialog';
import ScheduleCalendar from '@/components/schedules/schedule-calendar';
import BulkScheduleDialog from '@/components/schedules/bulk-schedule-dialog';
import { massTypeLabels } from '@/lib/validations/schedule';

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
        sortOrder: number;
      };
    }>;
  } | null;
  _count: {
    assignments: number;
  };
}

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<MassSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  // 성당 정보
  const [organizationName, setOrganizationName] = useState('');

  // 뷰 모드 (calendar / list)
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  // 다이얼로그 상태
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<MassSchedule | null>(null);

  // 요일별 일괄 추가 다이얼로그
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState<number | null>(null);

  // 월 선택
  const [currentDate, setCurrentDate] = useState(new Date());
  const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

  // 캘린더에서 선택된 날짜
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    fetchOrganizationInfo();
    fetchSchedules();
  }, [currentMonth]);

  const fetchOrganizationInfo = async () => {
    try {
      const response = await fetch('/api/auth/session');
      const session = await response.json();
      if (session?.user?.organizationId) {
        const orgResponse = await fetch(`/api/admin/organization`);
        const orgData = await orgResponse.json();
        setOrganizationName(orgData.name);
      }
    } catch (err) {
      console.error('성당 정보 조회 실패:', err);
    }
  };

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/schedules?month=${currentMonth}`);
      if (!response.ok) throw new Error('일정 조회 실패');
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

  // 일정 추가
  const handleAdd = (date?: Date) => {
    if (date && date instanceof Date) {
      // 로컬 날짜를 YYYY-MM-DD 형식으로 변환 (UTC 변환 없이)
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      setEditingSchedule({ date: dateString } as any);
    } else {
      setEditingSchedule(null);
    }
    setDialogOpen(true);
  };

  // 일정 수정
  const handleEdit = (schedule: MassSchedule) => {
    setEditingSchedule(schedule);
    setDialogOpen(true);
  };

  // 일정 삭제
  const handleDelete = async (schedule: MassSchedule) => {
    if (schedule._count.assignments > 0) {
      alert(`이 일정에 ${schedule._count.assignments}명의 봉사자가 배정되어 있어 삭제할 수 없습니다.\n먼저 배정을 해제해주세요.`);
      return;
    }

    if (!confirm(`${new Date(schedule.date).toLocaleDateString('ko-KR')} ${schedule.time} 미사 일정을 삭제하시겠습니까?`)) {
      return;
    }

    setDeleting(schedule.id);

    try {
      const response = await fetch(`/api/admin/schedules/${schedule.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '일정 삭제 실패');
      }

      alert('일정이 삭제되었습니다');
      fetchSchedules();
    } catch (err: any) {
      alert(`삭제 오류: ${err.message}`);
    } finally {
      setDeleting(null);
    }
  };

  // 다이얼로그 저장 완료
  const handleDialogSuccess = () => {
    setDialogOpen(false);
    fetchSchedules();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      month: 'long',
      day: 'numeric',
      weekday: 'short',
    });
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

  // 요일별 일괄 추가
  const handleBulkAdd = (dayOfWeek: number) => {
    setSelectedDayOfWeek(dayOfWeek);
    setBulkDialogOpen(true);
  };

  // 요일별 일괄 추가 성공
  const handleBulkAddSuccess = () => {
    setBulkDialogOpen(false);
    setSelectedDayOfWeek(null);
    fetchSchedules();
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
          <h1 className="text-3xl font-bold text-gray-900">봉사 일정 관리</h1>
          <p className="text-gray-600 mt-2">
            {currentDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })} · 총 {schedules.length}개 일정
            {selectedDate && (
              <span className="ml-2">
                · 선택: {selectedDate.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })} ({filteredSchedules.length}개)
              </span>
            )}
          </p>
        </div>

        <div className="flex gap-2 flex-shrink-0">
          {/* 뷰 모드 전환 버튼 */}
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

          {/* 일정 추가 버튼 */}
          <Button onClick={() => handleAdd()}>
            <PlusCircle className="mr-2 h-4 w-4" />
            일정 추가
          </Button>
        </div>
      </div>

      {/* 캘린더 뷰 */}
      {viewMode === 'calendar' && (
        <div className="space-y-6">
          {/* 요일별 일괄 추가 섹션 */}
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">
              {organizationName ? `${organizationName}의 미사 일정 입력` : '미사 일정 입력'}
            </h2>
            <div className="grid grid-cols-7 gap-3">
              {['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'].map((day, index) => (
                <Card
                  key={day}
                  className={`p-4 text-center transition-all hover:shadow-md ${
                    index === 0 ? 'border-red-200 bg-red-50' : index === 6 ? 'border-blue-200 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <div className={`font-semibold mb-3 ${index === 0 ? 'text-red-600' : index === 6 ? 'text-blue-600' : 'text-gray-700'}`}>
                    {day}
                  </div>
                  <Button
                    onClick={() => handleBulkAdd(index)}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    <PlusCircle className="h-4 w-4 mr-1" />
                    추가
                  </Button>
                </Card>
              ))}
            </div>
          </Card>

          {/* 캘린더 */}
          <ScheduleCalendar
            currentDate={currentDate}
            schedules={schedules}
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
            onAddSchedule={handleAdd}
          />
        </div>
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
                <p className="text-gray-500 mb-4">
                  {selectedDate ? '이 날짜에 일정이 없습니다' : '이번 달 일정이 없습니다'}
                </p>
                <Button onClick={() => handleAdd()}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  {selectedDate ? '이 날짜에 일정 추가하기' : '첫 번째 일정 추가하기'}
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>날짜</TableHead>
                    <TableHead>시간</TableHead>
                    <TableHead>미사 종류</TableHead>
                    <TableHead>필요 역할</TableHead>
                    <TableHead>배정 현황</TableHead>
                    <TableHead className="text-right">관리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSchedules.map((schedule, index) => {
                  const totalRequired = schedule.massTemplate?.slots.reduce((sum, slot) => sum + slot.requiredCount, 0) || 0;
                  const assignedCount = schedule._count.assignments;
                  const isFullyAssigned = assignedCount >= totalRequired;

                  // 날짜 그룹화 로직
                  const currentDate = formatDate(schedule.date);
                  const prevSchedule = index > 0 ? filteredSchedules[index - 1] : null;
                  const prevDate = prevSchedule ? formatDate(prevSchedule.date) : null;
                  const isSameDate = currentDate === prevDate;

                  // 같은 날짜의 일정 개수 계산 (rowspan용)
                  const sameDateSchedules = filteredSchedules.filter(s =>
                    formatDate(s.date) === currentDate
                  );
                  const isFirstOfDate = !isSameDate;
                  const rowSpan = isFirstOfDate ? sameDateSchedules.length : 0;

                  return (
                    <TableRow key={schedule.id}>
                      {/* 같은 날짜의 첫 번째 일정에만 날짜 표시 */}
                      {isFirstOfDate && (
                        <TableCell className="font-medium align-top" rowSpan={rowSpan}>
                          {currentDate}
                        </TableCell>
                      )}
                      <TableCell>{schedule.time}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {massTypeLabels[schedule.massTemplate?.massType || 'WEEKDAY']}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {schedule.massTemplate?.slots
                            .sort((a, b) => {
                              // sortOrder가 있으면 그것으로 정렬, 없으면 이름으로 정렬
                              const orderA = a.volunteerRole.sortOrder ?? 999;
                              const orderB = b.volunteerRole.sortOrder ?? 999;
                              if (orderA !== orderB) {
                                return orderA - orderB;
                              }
                              return a.volunteerRole.name.localeCompare(b.volunteerRole.name);
                            })
                            .map((slot) => (
                              <Badge
                                key={slot.id}
                                style={{
                                  backgroundColor: slot.volunteerRole.color,
                                  color: 'white',
                                }}
                                className="text-xs"
                              >
                                {slot.volunteerRole.name}
                              </Badge>
                            ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={isFullyAssigned ? 'default' : 'secondary'}>
                          {assignedCount}/{totalRequired}명
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(schedule)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          수정
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(schedule)}
                          disabled={deleting === schedule.id}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          {deleting === schedule.id ? '삭제 중...' : '삭제'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* 일정 추가/수정 다이얼로그 */}
      <ScheduleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        schedule={editingSchedule}
        onSuccess={handleDialogSuccess}
        schedules={schedules}
      />

      {/* 요일별 일괄 추가 다이얼로그 */}
      {selectedDayOfWeek !== null && (
        <BulkScheduleDialog
          open={bulkDialogOpen}
          onOpenChange={setBulkDialogOpen}
          dayOfWeek={selectedDayOfWeek}
          currentMonth={currentDate}
          onSuccess={handleBulkAddSuccess}
        />
      )}
    </div>
  );
}
