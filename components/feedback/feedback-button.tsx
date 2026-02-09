/**
 * 플로팅 피드백 버튼 + 패널
 * 화면 우하단 고정, 클릭 시 피드백 작성/내역 패널 열기
 * 탭 1: 새 피드백 작성
 * 탭 2: 내 피드백 내역 (답장 확인)
 */
'use client';

import { useState, useEffect } from 'react';
import { MessageSquarePlus, Send, Loader2, X, ChevronLeft, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
}

export function FeedbackButton() {
  // 패널 열림/닫힘 상태
  const [open, setOpen] = useState(false);
  // 현재 탭: 'write' (작성) | 'list' (내역)
  const [tab, setTab] = useState<'write' | 'list'>('write');
  // 카테고리
  const [category, setCategory] = useState('GENERAL');
  // 피드백 내용
  const [content, setContent] = useState('');
  // 제출 중 로딩
  const [submitting, setSubmitting] = useState(false);
  // 피드백 목록
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  // 목록 로딩
  const [loadingList, setLoadingList] = useState(false);
  // 제출 성공 메시지
  const [successMessage, setSuccessMessage] = useState('');
  // 읽지 않은 답장 수
  const [unreadCount, setUnreadCount] = useState(0);

  // 내 피드백 목록 가져오기
  const fetchFeedbacks = async () => {
    setLoadingList(true);
    try {
      const res = await fetch('/api/feedback');
      if (res.ok) {
        const data = await res.json();
        setFeedbacks(data);
        // 답장이 있지만 아직 확인하지 않은 건 수 계산
        const replied = data.filter((f: Feedback) => f.status === 'REPLIED');
        setUnreadCount(replied.length);
      }
    } catch (error) {
      console.error('피드백 목록 조회 실패:', error);
    } finally {
      setLoadingList(false);
    }
  };

  // 패널이 열릴 때 목록 가져오기
  useEffect(() => {
    if (open) {
      fetchFeedbacks();
    }
  }, [open]);

  // 피드백 제출
  const handleSubmit = async () => {
    if (content.trim().length < 5) return;

    setSubmitting(true);
    setSuccessMessage('');

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, content }),
      });

      if (res.ok) {
        setContent('');
        setCategory('GENERAL');
        setSuccessMessage('피드백이 접수되었습니다. 감사합니다!');
        fetchFeedbacks();
        // 3초 후 메시지 숨기기
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (error) {
      console.error('피드백 제출 실패:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // 상태 Badge 색상
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'REPLIED': return 'default';
      case 'CLOSED': return 'secondary';
      default: return 'outline';
    }
  };

  // 날짜 포맷
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      {/* 플로팅 버튼 */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95"
        aria-label="피드백 작성"
      >
        {open ? (
          <X className="h-6 w-6" />
        ) : (
          <div className="relative">
            <MessageSquarePlus className="h-6 w-6" />
            {/* 읽지 않은 답장 표시 */}
            {unreadCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {unreadCount}
              </span>
            )}
          </div>
        )}
      </button>

      {/* 피드백 패널 */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[360px] max-h-[520px] bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
          {/* 탭 헤더 */}
          <div className="flex border-b border-gray-200 bg-gray-50 rounded-t-xl">
            <button
              onClick={() => setTab('write')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                tab === 'write'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Send className="inline h-4 w-4 mr-1" />
              피드백 작성
            </button>
            <button
              onClick={() => setTab('list')}
              className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
                tab === 'list'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <MessageCircle className="inline h-4 w-4 mr-1" />
              내 피드백
              {unreadCount > 0 && (
                <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          {/* 탭 내용 */}
          <div className="flex-1 overflow-y-auto">
            {/* 작성 탭 */}
            {tab === 'write' && (
              <div className="p-4 space-y-4">
                {/* 카테고리 선택 */}
                <div className="space-y-2">
                  <Label className="text-sm">카테고리</Label>
                  <div className="flex gap-2">
                    {(['BUG', 'IMPROVEMENT', 'GENERAL'] as const).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategory(cat)}
                        className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                          category === cat
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                        }`}
                      >
                        {categoryLabels[cat]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 내용 입력 */}
                <div className="space-y-2">
                  <Label className="text-sm">내용</Label>
                  <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="문제점이나 개선 제안을 자유롭게 작성해주세요..."
                    rows={5}
                    maxLength={1000}
                    disabled={submitting}
                  />
                  <p className="text-xs text-gray-400 text-right">
                    {content.length}/1000
                  </p>
                </div>

                {/* 성공 메시지 */}
                {successMessage && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700">
                    {successMessage}
                  </div>
                )}

                {/* 제출 버튼 */}
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || content.trim().length < 5}
                  className="w-full"
                >
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {submitting ? '전송 중...' : '피드백 보내기'}
                </Button>
              </div>
            )}

            {/* 내역 탭 */}
            {tab === 'list' && (
              <div className="p-4">
                {loadingList ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : feedbacks.length === 0 ? (
                  <p className="text-center text-sm text-gray-500 py-8">
                    아직 작성한 피드백이 없습니다
                  </p>
                ) : (
                  <div className="space-y-3">
                    {feedbacks.map((fb) => (
                      <div
                        key={fb.id}
                        className="border border-gray-200 rounded-lg p-3 space-y-2"
                      >
                        {/* 헤더: 카테고리 + 상태 + 날짜 */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">
                              {categoryLabels[fb.category] || fb.category}
                            </span>
                            <Badge variant={getStatusVariant(fb.status)} className="text-xs">
                              {statusLabels[fb.status] || fb.status}
                            </Badge>
                          </div>
                          <span className="text-xs text-gray-400">
                            {formatDate(fb.createdAt)}
                          </span>
                        </div>

                        {/* 내용 */}
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">
                          {fb.content}
                        </p>

                        {/* 답장 (있을 경우) */}
                        {fb.reply && (
                          <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mt-2">
                            <p className="text-xs font-medium text-blue-700 mb-1">
                              <ChevronLeft className="inline h-3 w-3" />
                              관리자 답장
                              {fb.repliedAt && (
                                <span className="text-blue-500 font-normal ml-2">
                                  {formatDate(fb.repliedAt)}
                                </span>
                              )}
                            </p>
                            <p className="text-sm text-blue-900 whitespace-pre-wrap">
                              {fb.reply}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
