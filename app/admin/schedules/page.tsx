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
import { massTypeLabels } from '@/lib/validations/schedule';
import { vestmentColorLabels, vestmentColorCodes } from '@/lib/validations/template';
import { DesktopTable, MobileCardList, MobileCard, MobileCardHeader, MobileCardRow, MobileCardActions } from '@/components/ui/responsive-table';

interface MassSchedule {
  id: string;
  date: string;
  time: string;
  notes: string | null;
  massTemplate: {
    id: string;
    massType: string;
    vestmentColor: string | null;
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

  // 뷰 모드 (calendar / list)
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  // 다이얼로그 상태
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<MassSchedule | null>(null);

  // 월 선택
  const [currentDate, setCurrentDate] = useState(new Date());
  const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

  // 캘린더에서 선택된 날짜
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    fetchSchedules();
  }, [currentMonth]);

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
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">미사일정 추가</h1>
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
              <>
                {/* 모바일 카드 뷰 */}
                <MobileCardList>
                  {filteredSchedules.map((schedule) => {
                    const totalRequired = schedule.massTemplate?.slots.reduce((sum, slot) => sum + slot.requiredCount, 0) || 0;
                    const assignedCount = schedule._count.assignments;
                    const isFullyAssigned = assignedCount >= totalRequired;

                    return (
                      <MobileCard key={schedule.id}>
                        <MobileCardHeader>
                          <div>
                            <span className="font-medium text-sm">
                              {formatDate(schedule.date)}
                            </span>
                            <span className="text-sm text-gray-500 ml-2">{schedule.time}</span>
                          </div>
                          <Badge variant={isFullyAssigned ? 'default' : 'secondary'} className="text-xs">
                            {assignedCount}/{totalRequired}명
                          </Badge>
                        </MobileCardHeader>
                        <MobileCardRow label="미사 종류">
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className="text-xs">
                              {massTypeLabels[schedule.massTemplate?.massType || 'WEEKDAY']}
                            </Badge>
                            {/* 제의 색상 (선택된 경우에만 표시) */}
                            {schedule.massTemplate?.vestmentColor && (
                              <Badge variant="outline" className="flex items-center gap-1 text-xs">
                                <span
                                  className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${
                                    schedule.massTemplate.vestmentColor === 'WHITE' ? 'border border-gray-300' : ''
                                  }`}
                                  style={{ backgroundColor: vestmentColorCodes[schedule.massTemplate.vestmentColor] }}
                                />
                                {vestmentColorLabels[schedule.massTemplate.vestmentColor]}
                              </Badge>
                            )}
                          </div>
                        </MobileCardRow>
                        <div className="flex flex-wrap gap-1">
                          {schedule.massTemplate?.slots
                            .sort((a, b) => (a.volunteerRole.sortOrder ?? 999) - (b.volunteerRole.sortOrder ?? 999))
                            .map((slot) => (
                              <Badge
                                key={slot.id}
                                style={{ backgroundColor: slot.volunteerRole.color, color: 'white' }}
                                className="text-xs"
                              >
                                {slot.volunteerRole.name}
                              </Badge>
                            ))}
                        </div>
                        <MobileCardActions>
                          <Button variant="outline" size="sm" onClick={() => handleEdit(schedule)} className="flex-1">
                            <Edit className="h-4 w-4 mr-1" />
                            수정
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(schedule)}
                            disabled={deleting === schedule.id}
                            className="flex-1"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            {deleting === schedule.id ? '삭제 중...' : '삭제'}
                          </Button>
                        </MobileCardActions>
                      </MobileCard>
                    );
                  })}
                </MobileCardList>

                {/* 데스크톱 테이블 뷰 */}
                <DesktopTable>
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

                      const currentDate = formatDate(schedule.date);
                      const prevSchedule = index > 0 ? filteredSchedules[index - 1] : null;
                      const prevDate = prevSchedule ? formatDate(prevSchedule.date) : null;
                      const isSameDate = currentDate === prevDate;

                      const sameDateSchedules = filteredSchedules.filter(s =>
                        formatDate(s.date) === currentDate
                      );
                      const isFirstOfDate = !isSameDate;
                      const rowSpan = isFirstOfDate ? sameDateSchedules.length : 0;

                      return (
                        <TableRow key={schedule.id}>
                          {isFirstOfDate && (
                            <TableCell className="font-medium align-top" rowSpan={rowSpan}>
                              {currentDate}
                            </TableCell>
                          )}
                          <TableCell>{schedule.time}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Badge variant="outline">
                                {massTypeLabels[schedule.massTemplate?.massType || 'WEEKDAY']}
                              </Badge>
                              {/* 제의 색상 (선택된 경우에만 표시) */}
                              {schedule.massTemplate?.vestmentColor && (
                                <Badge variant="outline" className="flex items-center gap-1">
                                  <span
                                    className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${
                                      schedule.massTemplate.vestmentColor === 'WHITE' ? 'border border-gray-300' : ''
                                    }`}
                                    style={{ backgroundColor: vestmentColorCodes[schedule.massTemplate.vestmentColor] }}
                                  />
                                  {vestmentColorLabels[schedule.massTemplate.vestmentColor]}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {schedule.massTemplate?.slots
                                .sort((a, b) => {
                                  const orderA = a.volunteerRole.sortOrder ?? 999;
                                  const orderB = b.volunteerRole.sortOrder ?? 999;
                                  if (orderA !== orderB) return orderA - orderB;
                                  return a.volunteerRole.name.localeCompare(b.volunteerRole.name);
                                })
                                .map((slot) => (
                                  <Badge
                                    key={slot.id}
                                    style={{ backgroundColor: slot.volunteerRole.color, color: 'white' }}
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
                            <Button variant="outline" size="sm" onClick={() => handleEdit(schedule)}>
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
                </DesktopTable>
              </>
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

    </div>
  );
}
