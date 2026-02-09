/**
 * 총괄관리자 피드백 답장 다이얼로그
 * 피드백 상세 내용 표시 + 답장 작성 + 상태 변경
 */
'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { categoryLabels, statusLabels } from '@/lib/validations/feedback';

// 피드백 타입
interface Feedback {
  id: string;
  category: string;
  content: string;
  status: string;
  reply: string | null;
  repliedAt: string | null;
  createdAt: string;
  user: {
    name: string;
    email: string | null;
  };
  organization: {
    name: string;
  };
}

interface FeedbackReplyDialogProps {
  // 선택된 피드백 (null이면 닫힘)
  feedback: Feedback | null;
  // 다이얼로그 닫기 콜백
  onClose: () => void;
  // 답장 완료 후 콜백 (목록 새로고침용)
  onReplied: () => void;
}

export function FeedbackReplyDialog({
  feedback,
  onClose,
  onReplied,
}: FeedbackReplyDialogProps) {
  // 답장 내용
  const [reply, setReply] = useState('');
  // 상태 변경
  const [status, setStatus] = useState<'REPLIED' | 'CLOSED'>('REPLIED');
  // 제출 중 로딩
  const [submitting, setSubmitting] = useState(false);
  // 에러 메시지
  const [error, setError] = useState('');

  // 다이얼로그 열릴 때 기존 답장 내용 로드
  const handleOpenChange = (open: boolean) => {
    if (open && feedback) {
      // 기존 답장이 있으면 미리 채움
      setReply(feedback.reply || '');
      setStatus(feedback.status === 'CLOSED' ? 'CLOSED' : 'REPLIED');
      setError('');
    }
    if (!open) {
      onClose();
    }
  };

  // 답장 제출
  const handleSubmit = async () => {
    if (!feedback || reply.trim().length < 1) return;

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(`/api/super-admin/feedback/${feedback.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reply, status }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '답장 저장에 실패했습니다');
      }

      // 성공 시 콜백 호출
      onReplied();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // 날짜 포맷
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 카테고리 Badge 색상
  const getCategoryVariant = (category: string) => {
    switch (category) {
      case 'BUG':
        return 'destructive' as const;
      case 'IMPROVEMENT':
        return 'default' as const;
      default:
        return 'secondary' as const;
    }
  };

  return (
    <Dialog open={!!feedback} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>피드백 상세 / 답장</DialogTitle>
        </DialogHeader>

        {feedback && (
          <div className="space-y-4">
            {/* 피드백 정보 헤더 */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                {/* 카테고리 */}
                <Badge variant={getCategoryVariant(feedback.category)}>
                  {categoryLabels[feedback.category] || feedback.category}
                </Badge>
                {/* 현재 상태 */}
                <Badge variant="outline">
                  {statusLabels[feedback.status] || feedback.status}
                </Badge>
              </div>
              <span className="text-gray-500">
                {formatDate(feedback.createdAt)}
              </span>
            </div>

            {/* 작성자 정보 */}
            <div className="text-sm text-gray-600">
              <span className="font-medium">{feedback.organization.name}</span>
              {' · '}
              <span>{feedback.user.name}</span>
              {feedback.user.email && (
                <span className="text-gray-400 ml-1">
                  ({feedback.user.email})
                </span>
              )}
            </div>

            {/* 피드백 내용 */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-800 whitespace-pre-wrap">
                {feedback.content}
              </p>
            </div>

            {/* 답장 입력 */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">답장 내용</Label>
              <Textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="답장을 작성해주세요..."
                rows={4}
                maxLength={1000}
                disabled={submitting}
              />
              <p className="text-xs text-gray-400 text-right">
                {reply.length}/1000
              </p>
            </div>

            {/* 상태 변경 */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">상태 변경</Label>
              <div className="flex gap-2">
                {/* 답장완료 버튼 */}
                <button
                  type="button"
                  onClick={() => setStatus('REPLIED')}
                  className={`px-4 py-2 text-sm rounded-md border transition-colors ${
                    status === 'REPLIED'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                  }`}
                >
                  답장완료
                </button>
                {/* 종료 버튼 */}
                <button
                  type="button"
                  onClick={() => setStatus('CLOSED')}
                  className={`px-4 py-2 text-sm rounded-md border transition-colors ${
                    status === 'CLOSED'
                      ? 'bg-gray-700 text-white border-gray-700'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-gray-500'
                  }`}
                >
                  종료
                </button>
              </div>
            </div>

            {/* 에러 메시지 */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
                {error}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {/* 닫기 버튼 */}
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            닫기
          </Button>
          {/* 저장 버튼 */}
          <Button
            onClick={handleSubmit}
            disabled={submitting || reply.trim().length < 1}
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitting ? '저장 중...' : '답장 저장'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
