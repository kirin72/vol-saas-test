/**
 * 역할 관리 페이지
 * 봉사 역할 CRUD
 */
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Edit, Trash2, Loader2 } from 'lucide-react';
import RoleDialog from '@/components/roles/role-dialog';

interface VolunteerRole {
  id: string;
  name: string;
  description: string | null;
  color: string;
  sortOrder: number;
  genderPreference: string;
  isActive: boolean;
  _count: {
    userRoles: number;
  };
}

export default function RolesPage() {
  const [roles, setRoles] = useState<VolunteerRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  // 다이얼로그 상태
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<VolunteerRole | null>(null);

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/roles');
      if (!response.ok) throw new Error('역할 조회 실패');
      const data = await response.json();
      setRoles(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 역할 추가 다이얼로그 열기
  const handleAdd = () => {
    setEditingRole(null);
    setDialogOpen(true);
  };

  // 역할 수정 다이얼로그 열기
  const handleEdit = (role: VolunteerRole) => {
    setEditingRole(role);
    setDialogOpen(true);
  };

  // 역할 삭제
  const handleDelete = async (role: VolunteerRole) => {
    if (role._count.userRoles > 0) {
      alert(`이 역할을 가진 봉사자가 ${role._count.userRoles}명 있어 삭제할 수 없습니다.\n먼저 봉사자의 역할을 변경해주세요.`);
      return;
    }

    if (!confirm(`정말 "${role.name}" 역할을 삭제하시겠습니까?`)) {
      return;
    }

    setDeleting(role.id);

    try {
      const response = await fetch(`/api/admin/roles/${role.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '역할 삭제 실패');
      }

      alert('역할이 삭제되었습니다');
      fetchRoles(); // 목록 새로고침
    } catch (err: any) {
      alert(`삭제 오류: ${err.message}`);
    } finally {
      setDeleting(null);
    }
  };

  // 다이얼로그 저장 완료 후
  const handleDialogSuccess = () => {
    setDialogOpen(false);
    fetchRoles(); // 목록 새로고침
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">봉사 역할 관리</h1>
          <p className="text-gray-600 mt-2">
            총 {roles.length}개의 역할이 등록되어 있습니다
          </p>
        </div>
        <Button onClick={handleAdd} className="shrink-0">
          <PlusCircle className="mr-2 h-4 w-4" />
          역할 추가
        </Button>
      </div>

      {/* 역할 목록 */}
      {roles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-gray-500 mb-4">
              아직 등록된 역할이 없습니다
            </p>
            <Button onClick={handleAdd}>
              <PlusCircle className="mr-2 h-4 w-4" />
              첫 번째 역할 추가하기
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {roles.map((role) => (
            <Card key={role.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge
                        style={{
                          backgroundColor: role.color,
                          color: 'white',
                        }}
                        className="font-semibold"
                      >
                        {role.name}
                      </Badge>
                    </div>
                    {role.description && (
                      <p className="text-sm text-gray-600 mt-2">
                        {role.description}
                      </p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* 통계 */}
                  <div className="text-sm text-gray-600">
                    <p>봉사자 수: {role._count.userRoles}명</p>
                  </div>

                  {/* 수정/삭제 버튼 */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(role)}
                      className="flex-1"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      수정
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(role)}
                      disabled={deleting === role.id}
                      className="flex-1"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      {deleting === role.id ? '삭제 중...' : '삭제'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 역할 추가/수정 다이얼로그 */}
      <RoleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        role={editingRole}
        onSuccess={handleDialogSuccess}
      />
    </div>
  );
}
