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
import { Input } from '@/components/ui/input';
import { PlusCircle, Mail, Phone, Loader2, LayoutGrid, List as ListIcon, Search } from 'lucide-react';

interface Volunteer {
  id: string;
  name: string;
  baptismalName: string | null;
  email: string;
  phone: string | null;
  status: string;
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

  // 뷰 모드 (card / list)
  const [viewMode, setViewMode] = useState<'card' | 'list'>('list');

  // 검색
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchVolunteers();
  }, []);

  const fetchVolunteers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/volunteers');
      if (!response.ok) throw new Error('봉사자 목록 조회 실패');
      const data = await response.json();
      setVolunteers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 검색 필터링
  const filteredVolunteers = volunteers.filter((v) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      v.name.toLowerCase().includes(query) ||
      (v.baptismalName && v.baptismalName.toLowerCase().includes(query)) ||
      v.email.toLowerCase().includes(query) ||
      (v.phone && v.phone.includes(query))
    );
  });

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
          <h1 className="text-3xl font-bold text-gray-900">봉사자 관리</h1>
          <p className="text-gray-600 mt-2">
            총 {volunteers.length}명의 봉사자
            {searchQuery && ` · 검색 결과 ${filteredVolunteers.length}명`}
          </p>
        </div>

        <div className="flex gap-2 flex-shrink-0">
          {/* 뷰 모드 전환 */}
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

          {/* 등록 버튼 */}
          <Button asChild>
            <Link href="/admin/volunteers/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              봉사자 등록
            </Link>
          </Button>
        </div>
      </div>

      {/* 검색 */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="이름, 세례명, 이메일, 전화번호로 검색"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* 봉사자 목록 */}
      {filteredVolunteers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-gray-500 mb-4">
              {searchQuery ? '검색 결과가 없습니다' : '아직 등록된 봉사자가 없습니다'}
            </p>
            {!searchQuery && (
              <Button asChild>
                <Link href="/admin/volunteers/new">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  첫 번째 봉사자 등록하기
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* 카드 뷰 */}
          {viewMode === 'card' && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredVolunteers.map((volunteer) => (
                <Card
                  key={volunteer.id}
                  className="hover:shadow-lg transition-shadow"
                >
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">
                          {volunteer.name}
                          {volunteer.baptismalName && (
                            <span className="text-base font-normal text-gray-600 ml-2">
                              ({volunteer.baptismalName})
                            </span>
                          )}
                        </CardTitle>
                        <div className="mt-2 space-y-1">
                          {volunteer.email && (
                            <div className="flex items-center text-sm text-gray-600">
                              <Mail className="mr-2 h-3 w-3" />
                              {volunteer.email}
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
                      <Badge variant={getStatusVariant(volunteer.status)}>
                        {getStatusLabel(volunteer.status)}
                      </Badge>
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

                    {/* 상세보기 버튼 */}
                    <Button asChild variant="outline" className="w-full">
                      <Link href={`/admin/volunteers/${volunteer.id}`}>
                        상세보기
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* 리스트 뷰 */}
          {viewMode === 'list' && (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>이름</TableHead>
                      <TableHead>연락처</TableHead>
                      <TableHead>봉사 역할</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead className="text-right">관리</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVolunteers.map((volunteer) => (
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
                            {volunteer.email && (
                              <div className="flex items-center text-sm">
                                <Mail className="mr-2 h-3 w-3 text-gray-400" />
                                {volunteer.email}
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
