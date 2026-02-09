/**
 * 총괄관리자 피드백 관리 페이지
 * 전체 피드백 리스트 (테이블) + 상태 필터 + 답장 다이얼로그
 */
'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageCircle, Loader2 } from 'lucide-react';
import { FeedbackReplyDialog } from '@/components/feedback/feedback-reply-dialog';
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

// 상태 필터 옵션
const statusFilters = [
  { value: '', label: '전체' },
  { value: 'PENDING', label: '대기중' },
  { value: 'REPLIED', label: '답장완료' },
  { value: 'CLOSED', label: '종료' },
];

export default function FeedbackManagementPage() {
  // 피드백 목록
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  // 로딩 상태
  const [loading, setLoading] = useState(true);
  // 에러 메시지
  const [error, setError] = useState('');
  // 현재 상태 필터
  const [statusFilter, setStatusFilter] = useState('');
  // 선택된 피드백 (답장 다이얼로그용)
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(
    null
  );

  // 피드백 목록 가져오기
  const fetchFeedbacks = async () => {
    try {
      // 상태 필터 쿼리 파라미터 추가
      const url = statusFilter
        ? `/api/super-admin/feedback?status=${statusFilter}`
        : '/api/super-admin/feedback';

      const res = await fetch(url);
      if (!res.ok) throw new Error('피드백 조회 실패');

      const data = await res.json();
      setFeedbacks(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 초기 로딩 + 필터 변경 시 다시 조회
  useEffect(() => {
    setLoading(true);
    fetchFeedbacks();
  }, [statusFilter]);

  // 날짜 포맷
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 내용 미리보기 (최대 50자)
  const truncateContent = (content: string, maxLength = 50) => {
    return content.length > maxLength
      ? content.substring(0, maxLength) + '...'
      : content;
  };

  // 상태 Badge 스타일
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'REPLIED':
        return 'default' as const;
      case 'CLOSED':
        return 'secondary' as const;
      default:
        return 'outline' as const;
    }
  };

  // 카테고리 Badge 스타일
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

  // 상태별 건수 계산
  const pendingCount = feedbacks.filter((f) => f.status === 'PENDING').length;

  // 로딩 상태
  if (loading && feedbacks.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400 mr-2" />
        <p className="text-gray-500">로딩 중...</p>
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 페이지 제목 */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900">피드백 관리</h2>
        <p className="text-gray-600 mt-2">
          사용자들이 보낸 피드백을 확인하고 답장합니다
        </p>
      </div>

      {/* 상태 필터 + 대기 건수 */}
      <div className="flex items-center justify-between">
        {/* 필터 버튼 그룹 */}
        <div className="flex gap-2">
          {statusFilters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={`px-4 py-2 text-sm rounded-md border transition-colors ${
                statusFilter === filter.value
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* 대기 건수 표시 */}
        {pendingCount > 0 && (
          <Badge variant="destructive" className="text-sm px-3 py-1">
            대기중 {pendingCount}건
          </Badge>
        )}
      </div>

      {/* 피드백 테이블 */}
      <Card>
        <CardHeader>
          <CardTitle>피드백 목록</CardTitle>
          <CardDescription>총 {feedbacks.length}건</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">조직</TableHead>
                <TableHead className="w-[80px]">작성자</TableHead>
                <TableHead className="w-[90px]">카테고리</TableHead>
                <TableHead>내용</TableHead>
                <TableHead className="w-[80px]">상태</TableHead>
                <TableHead className="w-[120px]">작성일</TableHead>
                <TableHead className="w-[80px] text-right">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {feedbacks.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-gray-500 py-8"
                  >
                    {statusFilter
                      ? `"${statusFilters.find((f) => f.value === statusFilter)?.label}" 상태의 피드백이 없습니다`
                      : '아직 접수된 피드백이 없습니다'}
                  </TableCell>
                </TableRow>
              ) : (
                feedbacks.map((fb) => (
                  <TableRow
                    key={fb.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => setSelectedFeedback(fb)}
                  >
                    {/* 조직명 */}
                    <TableCell className="text-sm font-medium">
                      {fb.organization.name}
                    </TableCell>

                    {/* 작성자 */}
                    <TableCell className="text-sm">{fb.user.name}</TableCell>

                    {/* 카테고리 */}
                    <TableCell>
                      <Badge
                        variant={getCategoryVariant(fb.category)}
                        className="text-xs"
                      >
                        {categoryLabels[fb.category] || fb.category}
                      </Badge>
                    </TableCell>

                    {/* 내용 미리보기 */}
                    <TableCell className="text-sm text-gray-700">
                      {truncateContent(fb.content)}
                    </TableCell>

                    {/* 상태 */}
                    <TableCell>
                      <Badge
                        variant={getStatusVariant(fb.status)}
                        className="text-xs"
                      >
                        {statusLabels[fb.status] || fb.status}
                      </Badge>
                    </TableCell>

                    {/* 작성일 */}
                    <TableCell className="text-xs text-gray-500">
                      {formatDate(fb.createdAt)}
                    </TableCell>

                    {/* 답장 버튼 */}
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          // 행 클릭과 중복 방지
                          e.stopPropagation();
                          setSelectedFeedback(fb);
                        }}
                      >
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 답장 다이얼로그 */}
      <FeedbackReplyDialog
        feedback={selectedFeedback}
        onClose={() => setSelectedFeedback(null)}
        onReplied={() => {
          // 답장 완료 후 목록 새로고침
          fetchFeedbacks();
        }}
      />
    </div>
  );
}
