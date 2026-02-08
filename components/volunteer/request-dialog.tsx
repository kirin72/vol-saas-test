/**
 * 교체/삭제 요청 다이얼로그
 * 봉사자가 배정에 대해 교체 또는 삭제 요청을 보낼 수 있음
 */
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface RequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignment: {
    id: string;
    massSchedule: {
      date: string;
      time: string;
    };
    volunteerRole: {
      name: string;
    };
  } | null;
  requestType: 'CHANGE' | 'DELETE';
  onSuccess: () => void;
}

export function RequestDialog({
  open,
  onOpenChange,
  assignment,
  requestType,
  onSuccess,
}: RequestDialogProps) {
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!assignment) return;

    setLoading(true);

    try {
      const res = await fetch('/api/volunteer/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentId: assignment.id,
          type: requestType,
          notes,
        }),
      });

      if (res.ok) {
        alert('요청이 전송되었습니다');
        setNotes('');
        onOpenChange(false);
        onSuccess();
      } else {
        const error = await res.json();
        alert(error.error || '요청 전송 실패');
      }
    } catch (error) {
      console.error('요청 전송 오류:', error);
      alert('요청 전송 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  if (!assignment) return null;

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
          <DialogTitle>
            {requestType === 'CHANGE' ? '교체 요청' : '삭제 요청'}
          </DialogTitle>
          <DialogDescription>
            관리자에게 {requestType === 'CHANGE' ? '교체' : '삭제'} 요청을 보냅니다
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 배정 정보 */}
          <div className="p-4 bg-gray-50 rounded-md space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">날짜</span>
              <span className="text-sm font-medium">
                {formatDate(assignment.massSchedule.date)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">시간</span>
              <span className="text-sm font-medium">
                {assignment.massSchedule.time}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">역할</span>
              <span className="text-sm font-medium">
                {assignment.volunteerRole.name}
              </span>
            </div>
          </div>

          {/* 메모 */}
          <div className="space-y-2">
            <Label htmlFor="notes">
              요청 사유 {requestType === 'CHANGE' ? '(선택사항)' : ''}
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                requestType === 'CHANGE'
                  ? '교체가 필요한 사유를 입력해주세요'
                  : '삭제가 필요한 사유를 입력해주세요'
              }
              rows={4}
            />
          </div>

          {/* 버튼 */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="flex-1"
            >
              취소
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1"
              variant={requestType === 'DELETE' ? 'destructive' : 'default'}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? '전송 중...' : '요청 전송'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
