/**
 * Super Admin 조직 관리 페이지
 * 전체 조직 목록 및 상세 정보
 */
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  subscriptions: Array<{
    status: string;
    plan: {
      name: string;
      type: string;
      price: number;
    };
  }>;
  _count: {
    users: number;
  };
}

export default function OrganizationsPage() {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      const response = await fetch('/api/super-admin/organizations');
      if (!response.ok) throw new Error('조직 조회 실패');
      const data = await response.json();
      setOrganizations(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // 조직 삭제
  const handleDelete = async (orgId: string, orgName: string) => {
    if (!confirm(`정말 "${orgName}" 조직을 삭제하시겠습니까?\n\n⚠️ 이 작업은 되돌릴 수 없으며, 해당 조직의 모든 데이터(사용자, 일정, 배정 등)가 함께 삭제됩니다.`)) {
      return;
    }

    setDeleting(orgId);

    try {
      const response = await fetch(`/api/super-admin/organizations/${orgId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '조직 삭제 실패');
      }

      alert('조직이 삭제되었습니다');
      fetchOrganizations(); // 목록 새로고침
    } catch (err: any) {
      alert(`삭제 오류: ${err.message}`);
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">로딩 중...</p>
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
      <div>
        <h2 className="text-3xl font-bold text-gray-900">조직 관리</h2>
        <p className="text-gray-600 mt-2">
          등록된 모든 조직을 관리합니다
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>전체 조직 목록</CardTitle>
          <CardDescription>
            총 {organizations.length}개 조직
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>조직명</TableHead>
                <TableHead>식별자</TableHead>
                <TableHead>플랜</TableHead>
                <TableHead>구독 상태</TableHead>
                <TableHead>사용자 수</TableHead>
                <TableHead>가입일</TableHead>
                <TableHead>상태</TableHead>
                <TableHead className="text-right">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {organizations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-gray-500">
                    등록된 조직이 없습니다
                  </TableCell>
                </TableRow>
              ) : (
                organizations.map((org) => {
                  const subscription = org.subscriptions[0];
                  return (
                    <TableRow key={org.id}>
                      <TableCell className="font-medium">
                        {org.name}
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {org.slug}
                        </code>
                      </TableCell>
                      <TableCell>
                        {subscription ? (
                          <div>
                            <p className="text-sm font-medium">
                              {subscription.plan.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              ₩{subscription.plan.price.toLocaleString()}/월
                            </p>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {subscription ? (
                          <Badge
                            variant={
                              subscription.status === 'ACTIVE'
                                ? 'default'
                                : 'secondary'
                            }
                          >
                            {subscription.status}
                          </Badge>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>{org._count.users}명</TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {formatDate(org.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={org.isActive ? 'default' : 'secondary'}
                        >
                          {org.isActive ? '활성' : '비활성'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/super-admin/organizations/${org.id}`)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          수정
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(org.id, org.name)}
                          disabled={deleting === org.id}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          {deleting === org.id ? '삭제 중...' : '삭제'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
