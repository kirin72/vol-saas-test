/**
 * 요청 상세 다이얼로그
 * 봉사자가 작성한 요청 메모를 확인
 */
'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface RequestDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: {
    type: 'CHANGE' | 'DELETE';
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    notes: string | null;
    adminNotes: string | null;
    createdAt: string;
    user: {
      name: string;
      baptismalName: string | null;
    };
    assignment: {
      massSchedule: {
        date: string;
        time: string;
      };
      volunteerRole: {
        name: string;
        color: string | null;
      };
    };
  } | null;
}

export function RequestDetailDialog({
  open,
  onOpenChange,
  request,
}: RequestDetailDialogProps) {
  if (!request) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>요청 상세 정보</DialogTitle>
          <DialogDescription>
            봉사자가 작성한 요청 내용을 확인하세요
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 봉사자 정보 */}
          <div className="p-4 bg-gray-50 rounded-md space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">봉사자</span>
              <span className="text-sm font-medium">
                {request.user.name}
                {request.user.baptismalName && (
                  <span className="text-gray-500 ml-1">
                    ({request.user.baptismalName})
                  </span>
                )}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">요청 타입</span>
              <Badge
                variant={request.type === 'DELETE' ? 'destructive' : 'default'}
              >
                {request.type === 'CHANGE' ? '교체 요청' : '삭제 요청'}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">요청일</span>
              <span className="text-sm font-medium">
                {new Date(request.createdAt).toLocaleDateString('ko-KR')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">상태</span>
              {request.status === 'PENDING' ? (
                <Badge variant="secondary">대기 중</Badge>
              ) : request.status === 'APPROVED' ? (
                <Badge className="bg-green-600">승인됨</Badge>
              ) : (
                <Badge variant="destructive">거절됨</Badge>
              )}
            </div>
          </div>

          {/* 배정 정보 */}
          <div className="p-4 bg-blue-50 rounded-md space-y-2">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">
              배정 정보
            </h4>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">날짜</span>
              <span className="text-sm font-medium">
                {formatDate(request.assignment.massSchedule.date)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">시간</span>
              <span className="text-sm font-medium">
                {request.assignment.massSchedule.time}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">역할</span>
              <Badge
                style={{
                  backgroundColor: request.assignment.volunteerRole.color || '#6B7280',
                  color: 'white',
                }}
              >
                {request.assignment.volunteerRole.name}
              </Badge>
            </div>
          </div>

          {/* 봉사자 메모 */}
          {request.notes && (
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-2">
                요청 사유
              </h4>
              <div className="p-3 bg-gray-50 rounded-md text-sm text-gray-700">
                {request.notes}
              </div>
            </div>
          )}

          {/* 관리자 메모 */}
          {request.adminNotes && (
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-2">
                관리자 메모 (거절 사유)
              </h4>
              <div className="p-3 bg-red-50 rounded-md text-sm text-red-700">
                {request.adminNotes}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
