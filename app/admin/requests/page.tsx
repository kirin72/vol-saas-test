/**
 * 봉사자 요청 관리 페이지
 * 교체/삭제 요청 목록 확인 및 승인/거절
 */
'use client';

import { useState, useEffect, Fragment } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Check, X, MessageSquare, RefreshCw, User } from 'lucide-react';
import { RequestDetailDialog } from '@/components/admin/request-detail-dialog';
import { DesktopTable, MobileCardList, MobileCard, MobileCardHeader, MobileCardRow, MobileCardActions } from '@/components/ui/responsive-table';

// 교체 가능한 봉사자 타입
interface AvailableVolunteer {
  id: string;
  name: string;
  baptismalName: string | null;
  assignmentCount: number;
}

interface AssignmentRequest {
  id: string;
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
    id: string;
    massSchedule: {
      date: string;
      time: string;
      massTemplate: {
        massType: string;
      };
    };
    volunteerRole: {
      name: string;
      color: string | null;
    };
  };
}

export default function RequestsPage() {
  const [requests, setRequests] = useState<AssignmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<AssignmentRequest | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  // 필터 상태
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');

  // 교체 모드 상태
  const [replacingRequestId, setReplacingRequestId] = useState<string | null>(null);
  const [availableVolunteers, setAvailableVolunteers] = useState<AvailableVolunteer[]>([]);
  const [loadingVolunteers, setLoadingVolunteers] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/requests');
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      }
    } catch (error) {
      console.error('요청 목록 조회 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    if (!confirm('이 요청을 승인하시겠습니까?')) return;

    setProcessing(requestId);

    try {
      const res = await fetch(`/api/admin/requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'APPROVED' }),
      });

      if (res.ok) {
        alert('요청이 승인되었습니다');
        fetchRequests();
      } else {
        const error = await res.json();
        alert(error.error || '승인 실패');
      }
    } catch (error) {
      console.error('승인 오류:', error);
      alert('승인 중 오류가 발생했습니다');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (requestId: string) => {
    const adminNotes = prompt('거절 사유를 입력하세요 (선택사항):');

    setProcessing(requestId);

    try {
      const res = await fetch(`/api/admin/requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'REJECTED',
          adminNotes,
        }),
      });

      if (res.ok) {
        alert('요청이 거절되었습니다');
        fetchRequests();
      } else {
        const error = await res.json();
        alert(error.error || '거절 실패');
      }
    } catch (error) {
      console.error('거절 오류:', error);
      alert('거절 중 오류가 발생했습니다');
    } finally {
      setProcessing(null);
    }
  };

  // 교체 모드 시작 - 교체 가능한 봉사자 목록 로드
  const handleStartReplace = async (requestId: string) => {
    setReplacingRequestId(requestId);
    setLoadingVolunteers(true);

    try {
      const res = await fetch(`/api/admin/requests/${requestId}/available-volunteers`);
      if (res.ok) {
        const data = await res.json();
        setAvailableVolunteers(data);
      } else {
        const error = await res.json();
        alert(error.error || '봉사자 목록 조회 실패');
        setReplacingRequestId(null);
      }
    } catch (error) {
      console.error('봉사자 목록 조회 오류:', error);
      alert('봉사자 목록 조회 중 오류가 발생했습니다');
      setReplacingRequestId(null);
    } finally {
      setLoadingVolunteers(false);
    }
  };

  // 봉사자 교체 실행
  const handleReplaceVolunteer = async (requestId: string, newVolunteerId: string) => {
    if (!confirm('선택한 봉사자로 교체하시겠습니까?')) return;

    setProcessing(requestId);

    try {
      const res = await fetch(`/api/admin/requests/${requestId}/replace`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newVolunteerId }),
      });

      if (res.ok) {
        alert('봉사자가 교체되었습니다');
        setReplacingRequestId(null);
        setAvailableVolunteers([]);
        fetchRequests();
      } else {
        const error = await res.json();
        alert(error.error || '교체 실패');
      }
    } catch (error) {
      console.error('교체 오류:', error);
      alert('교체 중 오류가 발생했습니다');
    } finally {
      setProcessing(null);
    }
  };

  // 교체 모드 취소
  const handleCancelReplace = () => {
    setReplacingRequestId(null);
    setAvailableVolunteers([]);
  };

  const handleShowDetail = (request: AssignmentRequest) => {
    setSelectedRequest(request);
    setDetailDialogOpen(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      month: 'long',
      day: 'numeric',
      weekday: 'short',
    });
  };

  const filteredRequests = requests.filter((request) => {
    if (statusFilter === 'ALL') return true;
    return request.status === statusFilter;
  });

  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 페이지 제목 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">봉사자 요청 관리</h1>
          <p className="text-gray-600 mt-2">
            봉사자들의 교체 및 삭제 요청을 확인하고 처리하세요
          </p>
        </div>

        {pendingCount > 0 && (
          <Badge variant="destructive" className="text-lg px-4 py-2">
            {pendingCount}건 대기 중
          </Badge>
        )}
      </div>

      {/* 필터 (모바일에서 가로 스크롤) */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:overflow-visible">
        <Button
          variant={statusFilter === 'PENDING' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('PENDING')}
        >
          대기 중 ({requests.filter((r) => r.status === 'PENDING').length})
        </Button>
        <Button
          variant={statusFilter === 'APPROVED' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('APPROVED')}
        >
          승인됨 ({requests.filter((r) => r.status === 'APPROVED').length})
        </Button>
        <Button
          variant={statusFilter === 'REJECTED' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('REJECTED')}
        >
          거절됨 ({requests.filter((r) => r.status === 'REJECTED').length})
        </Button>
        <Button
          variant={statusFilter === 'ALL' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('ALL')}
        >
          전체 ({requests.length})
        </Button>
      </div>

      {/* 요청 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>요청 목록</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredRequests.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {statusFilter === 'PENDING'
                ? '대기 중인 요청이 없습니다'
                : '요청이 없습니다'}
            </div>
          ) : (
            <>
              {/* 모바일 카드 뷰 */}
              <MobileCardList>
                {filteredRequests
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((request) => (
                    <MobileCard key={request.id}>
                      {/* 카드 헤더: 봉사자명 + 상태 */}
                      <MobileCardHeader>
                        <div>
                          <span className="font-medium">
                            {request.user.name}
                            {request.user.baptismalName && (
                              <span className="text-gray-500 ml-1">
                                ({request.user.baptismalName})
                              </span>
                            )}
                          </span>
                          <div className="flex gap-1 mt-1">
                            <Badge
                              variant={request.type === 'DELETE' ? 'destructive' : 'default'}
                              className="text-xs"
                            >
                              {request.type === 'CHANGE' ? '교체' : '삭제'}
                            </Badge>
                          </div>
                        </div>
                        {request.status === 'PENDING' ? (
                          <Badge variant="secondary">대기 중</Badge>
                        ) : request.status === 'APPROVED' ? (
                          <Badge className="bg-green-600">승인됨</Badge>
                        ) : (
                          <Badge variant="destructive">거절됨</Badge>
                        )}
                      </MobileCardHeader>

                      {/* 일정 정보 */}
                      <MobileCardRow label="일정">
                        {formatDate(request.assignment.massSchedule.date)} {request.assignment.massSchedule.time}
                      </MobileCardRow>
                      <MobileCardRow label="역할">
                        <Badge
                          style={{
                            backgroundColor: request.assignment.volunteerRole.color || '#6B7280',
                            color: 'white',
                          }}
                          className="text-xs"
                        >
                          {request.assignment.volunteerRole.name}
                        </Badge>
                      </MobileCardRow>
                      <MobileCardRow label="요청일">
                        {new Date(request.createdAt).toLocaleDateString('ko-KR')}
                      </MobileCardRow>

                      {/* 액션 버튼 */}
                      {request.status === 'PENDING' && (
                        <MobileCardActions>
                          {request.notes && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleShowDetail(request)}
                            >
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                          )}
                          {request.type === 'CHANGE' ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                replacingRequestId === request.id
                                  ? handleCancelReplace()
                                  : handleStartReplace(request.id)
                              }
                              disabled={processing === request.id}
                              className="text-blue-600 border-blue-600 hover:bg-blue-50 flex-1"
                            >
                              <RefreshCw className="h-4 w-4 mr-1" />
                              {replacingRequestId === request.id ? '취소' : '교체'}
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleApprove(request.id)}
                              disabled={processing === request.id}
                              className="text-green-600 border-green-600 hover:bg-green-50 flex-1"
                            >
                              <Check className="h-4 w-4 mr-1" />
                              승인
                            </Button>
                          )}
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleReject(request.id)}
                            disabled={processing === request.id}
                            className="flex-1"
                          >
                            <X className="h-4 w-4 mr-1" />
                            거절
                          </Button>
                        </MobileCardActions>
                      )}

                      {/* 교체 가능한 봉사자 목록 */}
                      {replacingRequestId === request.id && (
                        <div className="bg-blue-50 rounded-lg p-3 space-y-2 mt-2">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-blue-600" />
                            <span className="font-semibold text-blue-900 text-sm">
                              교체 가능 ({availableVolunteers.length}명)
                            </span>
                          </div>
                          {loadingVolunteers ? (
                            <div className="flex justify-center py-2">
                              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-2">
                              {availableVolunteers.map((volunteer) => (
                                <button
                                  key={volunteer.id}
                                  onClick={() => handleReplaceVolunteer(request.id, volunteer.id)}
                                  disabled={processing === request.id}
                                  className="flex items-center justify-between p-2 bg-white border border-gray-200 rounded-md text-left disabled:opacity-50 min-h-[44px]"
                                >
                                  <div>
                                    <div className="font-medium text-xs">{volunteer.name}</div>
                                    <div className="text-xs text-gray-500">{volunteer.assignmentCount}회</div>
                                  </div>
                                  <RefreshCw className="h-3 w-3 text-blue-600 shrink-0" />
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </MobileCard>
                  ))}
              </MobileCardList>

              {/* 데스크톱 테이블 뷰 */}
              <DesktopTable>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>봉사자</TableHead>
                      <TableHead>요청 타입</TableHead>
                      <TableHead>일정</TableHead>
                      <TableHead>역할</TableHead>
                      <TableHead>요청일</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead className="text-right">관리</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRequests
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .map((request) => (
                        <Fragment key={request.id}>
                          <TableRow>
                            <TableCell className="font-medium">
                              {request.user.name}
                              {request.user.baptismalName && (
                                <span className="text-gray-500 ml-1">
                                  ({request.user.baptismalName})
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={request.type === 'DELETE' ? 'destructive' : 'default'}
                              >
                                {request.type === 'CHANGE' ? '교체 요청' : '삭제 요청'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {formatDate(request.assignment.massSchedule.date)}{' '}
                              {request.assignment.massSchedule.time}
                            </TableCell>
                            <TableCell>
                              <Badge
                                style={{
                                  backgroundColor: request.assignment.volunteerRole.color || '#6B7280',
                                  color: 'white',
                                }}
                              >
                                {request.assignment.volunteerRole.name}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-gray-600">
                              {new Date(request.createdAt).toLocaleDateString('ko-KR')}
                            </TableCell>
                            <TableCell>
                              {request.status === 'PENDING' ? (
                                <Badge variant="secondary">대기 중</Badge>
                              ) : request.status === 'APPROVED' ? (
                                <Badge className="bg-green-600">승인됨</Badge>
                              ) : (
                                <Badge variant="destructive">거절됨</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right space-x-2">
                              {request.notes && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleShowDetail(request)}
                                >
                                  <MessageSquare className="h-4 w-4" />
                                </Button>
                              )}
                              {request.status === 'PENDING' && (
                                <>
                                  {request.type === 'CHANGE' ? (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() =>
                                        replacingRequestId === request.id
                                          ? handleCancelReplace()
                                          : handleStartReplace(request.id)
                                      }
                                      disabled={processing === request.id}
                                      className="text-blue-600 border-blue-600 hover:bg-blue-50"
                                    >
                                      <RefreshCw className="h-4 w-4 mr-1" />
                                      {replacingRequestId === request.id ? '취소' : '교체'}
                                    </Button>
                                  ) : (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleApprove(request.id)}
                                      disabled={processing === request.id}
                                      className="text-green-600 border-green-600 hover:bg-green-50"
                                    >
                                      <Check className="h-4 w-4 mr-1" />
                                      승인
                                    </Button>
                                  )}
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleReject(request.id)}
                                    disabled={processing === request.id}
                                  >
                                    <X className="h-4 w-4 mr-1" />
                                    거절
                                  </Button>
                                </>
                              )}
                            </TableCell>
                          </TableRow>

                          {replacingRequestId === request.id && (
                            <TableRow>
                              <TableCell colSpan={7} className="bg-blue-50 p-4">
                                <div className="space-y-3">
                                  <div className="flex items-center gap-2">
                                    <User className="h-5 w-5 text-blue-600" />
                                    <h3 className="font-semibold text-blue-900">
                                      교체 가능한 봉사자 ({availableVolunteers.length}명)
                                    </h3>
                                  </div>
                                  {loadingVolunteers ? (
                                    <div className="flex justify-center py-4">
                                      <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                                    </div>
                                  ) : availableVolunteers.length === 0 ? (
                                    <p className="text-sm text-gray-600">교체 가능한 봉사자가 없습니다</p>
                                  ) : (
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                      {availableVolunteers.map((volunteer) => (
                                        <button
                                          key={volunteer.id}
                                          onClick={() => handleReplaceVolunteer(request.id, volunteer.id)}
                                          disabled={processing === request.id}
                                          className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-md hover:bg-blue-50 hover:border-blue-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                          <div className="text-left">
                                            <div className="font-medium text-sm">
                                              {volunteer.name}
                                              {volunteer.baptismalName && (
                                                <span className="text-gray-500 text-xs ml-1">({volunteer.baptismalName})</span>
                                              )}
                                            </div>
                                            <div className="text-xs text-gray-600 mt-1">이번 달 {volunteer.assignmentCount}회</div>
                                          </div>
                                          <RefreshCw className="h-4 w-4 text-blue-600" />
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      ))}
                  </TableBody>
                </Table>
              </DesktopTable>
            </>
          )}
        </CardContent>
      </Card>

      {/* 요청 상세 다이얼로그 */}
      <RequestDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        request={selectedRequest}
      />
    </div>
  );
}
