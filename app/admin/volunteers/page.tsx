/**
 * 봉사자 목록 페이지
 * 카드 뷰 / 리스트 뷰 전환 가능
 */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Mail, Phone, Loader2, LayoutGrid, List as ListIcon, UserCheck, Pencil } from 'lucide-react';
import { DesktopTable, MobileCardList, MobileCard, MobileCardHeader, MobileCardRow, MobileCardActions } from '@/components/ui/responsive-table';
import { getTreasurer, type TreasurerInfo } from '@/lib/actions/treasurer';
import { TreasurerDialog } from './_components/TreasurerDialog';

interface Volunteer {
  id: string;
  name: string;
  baptismalName: string | null;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  hasPaidDues: boolean;
  userRoles: Array<{
    id: string;
    volunteerRole: {
      id: string;
      name: string;
      color: string;
    };
  }>;
}

export default function VolunteersPage() {
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 총무 관련 상태
  const [treasurer, setTreasurer] = useState<TreasurerInfo | null>(null); // 현재 총무 정보
  const [treasurerDialogOpen, setTreasurerDialogOpen] = useState(false); // 총무 선택 Dialog 열림

  // 뷰 모드 (card / list)
  const [viewMode, setViewMode] = useState<'card' | 'list'>('list');

  // 이메일 표시 상태 관리 (봉사자 ID를 키로)
  const [showEmailMap, setShowEmailMap] = useState<Record<string, boolean>>({});

  // 이메일 토글 함수
  const toggleEmail = (volunteerId: string) => {
    setShowEmailMap((prev) => ({
      ...prev,
      [volunteerId]: !prev[volunteerId],
    }));
  };

  useEffect(() => {
    fetchVolunteers();
  }, []);

  const fetchVolunteers = async () => {
    try {
      setLoading(true);

      // 봉사자 목록 + 총무 정보 동시 조회
      const [response, treasurerResult] = await Promise.all([
        fetch('/api/admin/volunteers'),
        getTreasurer(),
      ]);

      if (!response.ok) throw new Error('봉사자 목록 조회 실패');
      const data = await response.json();
      setVolunteers(data);

      // 총무 정보 설정
      if (treasurerResult.success) {
        setTreasurer(treasurerResult.data || null);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 총무 변경 후 데이터 갱신
  const handleTreasurerChange = async () => {
    const result = await getTreasurer();
    if (result.success) {
      setTreasurer(result.data || null);
    }
  };

  // 상태 레이블
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return '활성';
      case 'INACTIVE':
        return '비활성';
      case 'PENDING':
        return '대기';
      default:
        return status;
    }
  };

  // 상태 색상
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'default';
      case 'INACTIVE':
        return 'secondary';
      default:
        return 'outline';
    }
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
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">봉사자 관리</h1>
          <p className="text-gray-600 mt-2">
            총 {volunteers.length}명의 봉사자
          </p>
        </div>

        <div className="flex gap-2 flex-shrink-0">
          {/* 뷰 모드 전환 (데스크톱에서만 표시, 모바일은 항상 카드뷰) */}
          <div className="hidden sm:flex gap-2">
            <Button
              variant={viewMode === 'card' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('card')}
            >
              <LayoutGrid className="h-4 w-4 mr-1" />
              카드
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <ListIcon className="h-4 w-4 mr-1" />
              리스트
            </Button>
          </div>

          {/* 버튼 그룹 */}
          <Button asChild>
            <Link href="/admin/volunteers/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              봉사자 등록
            </Link>
          </Button>
        </div>
      </div>

      {/* 총무 지정 배너 */}
      {treasurer ? (
        // 총무가 지정된 경우: 초록 배경
        <div className="bg-green-50 border border-green-200 rounded-md px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-green-600" />
            <span className="text-sm text-green-800">
              <strong>총무:</strong> {treasurer.name}
              {treasurer.baptismalName && (
                <span className="text-green-700"> ({treasurer.baptismalName})</span>
              )}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTreasurerDialogOpen(true)}
            className="text-green-700 border-green-300 hover:bg-green-100"
          >
            <Pencil className="h-3 w-3 mr-1" />
            변경
          </Button>
        </div>
      ) : (
        // 총무가 미지정인 경우: 노란 배경
        <div className="bg-yellow-50 border border-yellow-200 rounded-md px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-yellow-800">
            총무가 지정되어 있지 않습니다.<br />
            총무는 입출금을 관리할 수 있습니다.<br />
            우측 버튼으로 총무를 지정해 주세요.
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTreasurerDialogOpen(true)}
            className="text-yellow-700 border-yellow-300 hover:bg-yellow-100 shrink-0"
          >
            총무 지정하기
          </Button>
        </div>
      )}

      {/* 총무 선택 Dialog */}
      <TreasurerDialog
        open={treasurerDialogOpen}
        onOpenChange={setTreasurerDialogOpen}
        volunteers={volunteers.filter((v) => v.role !== 'ADMIN').map((v) => ({
          id: v.id,
          name: v.name,
          baptismalName: v.baptismalName,
        }))}
        currentTreasurerId={treasurer?.id || null}
        onSuccess={handleTreasurerChange}
      />

      {/* 안내 배너 */}
      <div className="bg-blue-50 border border-blue-200 text-blue-700 text-sm px-4 py-3 rounded-md">
      ⭐모든 봉사자는 본인의 <strong>이름</strong>과 <strong>휴대폰번호</strong> 뒤 8자리로 개별 로그인 할 수 있습니다.
      </div>

      {/* 봉사자 목록 */}
      {volunteers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-gray-500 mb-4">
              아직 등록된 봉사자가 없습니다
            </p>
            <Button asChild>
              <Link href="/admin/volunteers/new">
                <PlusCircle className="mr-2 h-4 w-4" />
                첫 번째 봉사자 등록하기
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* 카드 뷰 (모바일에서는 항상 표시, 데스크톱에서는 viewMode가 card일 때만) */}
          <div className={`grid gap-4 md:grid-cols-2 lg:grid-cols-3 ${viewMode === 'card' ? '' : 'sm:hidden'}`}>
              {volunteers.map((volunteer) => (
                <Card
                  key={volunteer.id}
                  className="hover:shadow-lg transition-shadow"
                >
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-lg">
                          {volunteer.name}
                          {volunteer.baptismalName && (
                            <span className="text-base font-normal text-gray-600 ml-2">
                              ({volunteer.baptismalName})
                            </span>
                          )}
                        </CardTitle>
                        <div className="mt-2 space-y-1">
                          {volunteer.email && !volunteer.email.includes('@temp.com') && (
                            <div className="flex items-center text-sm text-gray-600">
                              <Mail className="mr-2 h-3 w-3" />
                              {showEmailMap[volunteer.id] ? (
                                <>
                                  <span>{volunteer.email}</span>
                                  <button
                                    type="button"
                                    onClick={() => toggleEmail(volunteer.id)}
                                    className="ml-2 text-xs text-gray-400 hover:text-gray-600"
                                  >
                                    숨기기
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => toggleEmail(volunteer.id)}
                                  className="text-blue-600 hover:text-blue-800 text-xs underline"
                                >
                                  이메일 보기
                                </button>
                              )}
                            </div>
                          )}
                          {volunteer.phone && (
                            <div className="flex items-center text-sm text-gray-600">
                              <Phone className="mr-2 h-3 w-3" />
                              {volunteer.phone}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Badge variant={getStatusVariant(volunteer.status)}>
                          {getStatusLabel(volunteer.status)}
                        </Badge>
                        <Badge variant={volunteer.hasPaidDues ? 'default' : 'secondary'}>
                          {volunteer.hasPaidDues ? '납부' : '미납'}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* 역할 Badge */}
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        봉사 역할:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {volunteer.userRoles.length === 0 ? (
                          <span className="text-sm text-gray-400">역할 없음</span>
                        ) : (
                          volunteer.userRoles.map((userRole) => (
                            <Badge
                              key={userRole.id}
                              style={{
                                backgroundColor: userRole.volunteerRole.color,
                                color: 'white',
                              }}
                            >
                              {userRole.volunteerRole.name}
                            </Badge>
                          ))
                        )}
                      </div>
                    </div>

                    {/* 정보수정 버튼 */}
                    <Button asChild variant="outline" className="w-full">
                      <Link href={`/admin/volunteers/${volunteer.id}`}>
                        정보수정
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
          </div>

          {/* 리스트 뷰 (데스크톱 전용) */}
          {viewMode === 'list' && (
            <Card className="hidden sm:block">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>이름</TableHead>
                      <TableHead>연락처</TableHead>
                      <TableHead>봉사 역할</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>회비 납부</TableHead>
                      <TableHead className="text-right">관리</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {volunteers.map((volunteer) => (
                      <TableRow key={volunteer.id}>
                        <TableCell className="font-medium">
                          {volunteer.name}
                          {volunteer.baptismalName && (
                            <span className="text-gray-500 ml-1">
                              ({volunteer.baptismalName})
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {volunteer.email && !volunteer.email.includes('@temp.com') && (
                              <div className="flex items-center text-sm">
                                <Mail className="mr-2 h-3 w-3 text-gray-400" />
                                {showEmailMap[volunteer.id] ? (
                                  <>
                                    <span>{volunteer.email}</span>
                                    <button
                                      type="button"
                                      onClick={() => toggleEmail(volunteer.id)}
                                      className="ml-2 text-xs text-gray-400 hover:text-gray-600"
                                    >
                                      숨기기
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => toggleEmail(volunteer.id)}
                                    className="text-blue-600 hover:text-blue-800 text-xs underline"
                                  >
                                    이메일 보기
                                  </button>
                                )}
                              </div>
                            )}
                            {volunteer.phone && (
                              <div className="flex items-center text-sm">
                                <Phone className="mr-2 h-3 w-3 text-gray-400" />
                                {volunteer.phone}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {volunteer.userRoles.length === 0 ? (
                              <span className="text-sm text-gray-400">-</span>
                            ) : (
                              volunteer.userRoles.map((userRole) => (
                                <Badge
                                  key={userRole.id}
                                  style={{
                                    backgroundColor: userRole.volunteerRole.color,
                                    color: 'white',
                                  }}
                                  className="text-xs"
                                >
                                  {userRole.volunteerRole.name}
                                </Badge>
                              ))
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(volunteer.status)}>
                            {getStatusLabel(volunteer.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={volunteer.hasPaidDues ? 'default' : 'secondary'}>
                            {volunteer.hasPaidDues ? '납부' : '미납'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/admin/volunteers/${volunteer.id}`}>
                              수정
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
