/**
 * 배정 리스트
 * - 리스트 뷰: 표 형식으로 배정 목록 표시
 * - 캘린더 뷰: 달력 형식으로 배정 표시
 * - 교체/삭제 요청 기능
 */
'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RequestDialog } from './request-dialog';
import { massTypeLabels } from '@/lib/validations/schedule';

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
  request?: {
    id: string;
    type: 'CHANGE' | 'DELETE';
    status: 'PENDING' | 'REJECTED';
    adminNotes: string | null;
  } | null;
}

interface AssignmentListProps {
  assignments: Assignment[];
  viewMode: 'list' | 'calendar';
  onUpdate: () => void;
}

export function AssignmentList({
  assignments,
  viewMode,
  onUpdate,
}: AssignmentListProps) {
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [requestType, setRequestType] = useState<'CHANGE' | 'DELETE'>('CHANGE');

  const handleRequest = (assignment: Assignment, type: 'CHANGE' | 'DELETE') => {
    setSelectedAssignment(assignment);
    setRequestType(type);
    setRequestDialogOpen(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      month: 'long',
      day: 'numeric',
      weekday: 'short',
    });
  };

  if (viewMode === 'calendar') {
    // 캘린더 뷰
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // 달력 생성 로직
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const weeks: (Date | null)[][] = [];

    let currentWeek: (Date | null)[] = Array(firstDay).fill(null);

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      currentWeek.push(date);

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      weeks.push(currentWeek);
    }

    return (
      <div className="space-y-4">
        {/* 달력 */}
        <div className="grid grid-cols-7 gap-2">
          {/* 요일 헤더 */}
          {['일', '월', '화', '수', '목', '금', '토'].map((day, index) => (
            <div
              key={day}
              className={`text-center font-semibold text-sm py-2 ${
                index === 0 ? 'text-red-600' : index === 6 ? 'text-blue-600' : 'text-gray-700'
              }`}
            >
              {day}
            </div>
          ))}

          {/* 날짜 */}
          {weeks.map((week, weekIndex) => (
            week.map((date, dayIndex) => {
              const dateStr = date ? date.toISOString().split('T')[0] : '';
              const dayAssignments = date
                ? assignments.filter(
                    (a) => a.massSchedule.date.split('T')[0] === dateStr
                  )
                : [];

              return (
                <div
                  key={`${weekIndex}-${dayIndex}`}
                  className={`min-h-24 p-2 border rounded-md ${
                    date ? 'bg-white' : 'bg-gray-50'
                  }`}
                >
                  {date && (
                    <>
                      <div className="text-sm font-medium mb-1">
                        {date.getDate()}
                      </div>
                      {dayAssignments.length > 0 && (
                        <div className="space-y-1">
                          {dayAssignments.map((assignment) => (
                            <div
                              key={assignment.id}
                              className="text-xs p-1 rounded"
                              style={{
                                backgroundColor: assignment.volunteerRole.color || '#6B7280',
                                color: 'white',
                              }}
                            >
                              {assignment.massSchedule.time} {assignment.volunteerRole.name}
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })
          ))}
        </div>
      </div>
    );
  }

  // 리스트 뷰
  if (assignments.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        이번 달 배정된 일정이 없습니다
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>날짜</TableHead>
            <TableHead>시간</TableHead>
            <TableHead>미사 종류</TableHead>
            <TableHead>역할</TableHead>
            <TableHead>상태</TableHead>
            <TableHead className="text-right">관리</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assignments
            .sort(
              (a, b) =>
                new Date(a.massSchedule.date).getTime() -
                new Date(b.massSchedule.date).getTime()
            )
            .map((assignment) => (
              <TableRow key={assignment.id}>
                <TableCell className="font-medium">
                  {formatDate(assignment.massSchedule.date)}
                </TableCell>
                <TableCell>{assignment.massSchedule.time}</TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {massTypeLabels[assignment.massSchedule.massTemplate.massType] ||
                      assignment.massSchedule.massTemplate.massType}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    style={{
                      backgroundColor: assignment.volunteerRole.color || '#6B7280',
                      color: 'white',
                    }}
                  >
                    {assignment.volunteerRole.name}
                  </Badge>
                </TableCell>
                <TableCell>
                  {assignment.request?.status === 'PENDING' ? (
                    <Badge className="bg-orange-500 text-white">
                      {assignment.request.type === 'CHANGE' ? '교체 요청됨' : '삭제 요청됨'}
                    </Badge>
                  ) : assignment.request?.status === 'REJECTED' ? (
                    <Badge
                      variant="destructive"
                      className="cursor-pointer hover:opacity-80"
                      onClick={() => {
                        if (assignment.request?.adminNotes) {
                          alert(`관리자 메모:\n${assignment.request.adminNotes}`);
                        } else {
                          alert('관리자 메모가 없습니다.');
                        }
                      }}
                    >
                      {assignment.request.type === 'CHANGE' ? '교체 거절됨' : '삭제 거절됨'}
                      {assignment.request.adminNotes && ' 📝'}
                    </Badge>
                  ) : assignment.status === 'CONFIRMED' ? (
                    <Badge className="bg-green-600">확인됨</Badge>
                  ) : assignment.status === 'REJECTED' ? (
                    <Badge variant="destructive">거절됨</Badge>
                  ) : (
                    <Badge variant="secondary">배정됨</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  {assignment.request?.status !== 'PENDING' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRequest(assignment, 'CHANGE')}
                      >
                        교체 요청
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRequest(assignment, 'DELETE')}
                      >
                        삭제 요청
                      </Button>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>

      {/* 교체/삭제 요청 다이얼로그 */}
      <RequestDialog
        open={requestDialogOpen}
        onOpenChange={setRequestDialogOpen}
        assignment={selectedAssignment}
        requestType={requestType}
        onSuccess={onUpdate}
      />
    </>
  );
}
