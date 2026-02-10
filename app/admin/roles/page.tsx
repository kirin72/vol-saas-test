/**
 * 역할 관리 페이지
 * 토글 방식 역할 활성/비활성 + 역할 관리 메뉴 (추가/수정/삭제)
 */
'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings, Loader2, Plus, Edit, Trash2 } from 'lucide-react';
import RoleDialog from '@/components/roles/role-dialog';

// 역할 타입
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
  const [toggling, setToggling] = useState<string | null>(null); // 토글 중인 역할 ID
  const [deleting, setDeleting] = useState<string | null>(null);

  // 역할 관리 드롭다운 상태
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 다이얼로그 상태
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<VolunteerRole | null>(null);

  // 삭제 모드 (역할 관리 > 삭제 선택 시)
  const [deleteMode, setDeleteMode] = useState(false);

  useEffect(() => {
    fetchRoles();
  }, []);

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 역할 목록 조회
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

  // 역할 활성/비활성 토글
  const handleToggle = async (role: VolunteerRole) => {
    setToggling(role.id);
    try {
      const response = await fetch(`/api/admin/roles/${role.id}/toggle-active`, {
        method: 'PATCH',
      });

      if (!response.ok) {
        throw new Error('역할 상태 변경 실패');
      }

      // 로컬 상태 즉시 업데이트 (서버 응답 대기 없이 빠른 반영)
      setRoles((prev) =>
        prev.map((r) =>
          r.id === role.id ? { ...r, isActive: !r.isActive } : r
        )
      );
    } catch (err: any) {
      alert(`상태 변경 오류: ${err.message}`);
    } finally {
      setToggling(null);
    }
  };

  // 역할 추가 다이얼로그 열기
  const handleAdd = () => {
    setEditingRole(null);
    setDialogOpen(true);
    setMenuOpen(false);
  };

  // 역할 수정 모드 → 역할 클릭 시 수정 다이얼로그
  const handleEdit = (role: VolunteerRole) => {
    setEditingRole(role);
    setDialogOpen(true);
  };

  // 역할 삭제
  const handleDelete = async (role: VolunteerRole) => {
    // 봉사자가 있는 역할은 삭제 불가
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
      fetchRoles();
    } catch (err: any) {
      alert(`삭제 오류: ${err.message}`);
    } finally {
      setDeleting(null);
    }
  };

  // 다이얼로그 저장 완료 후
  const handleDialogSuccess = () => {
    setDialogOpen(false);
    fetchRoles();
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
            역할을 클릭하여 활성/비활성을 전환하세요
          </p>
        </div>

        {/* 역할 관리 드롭다운 버튼 */}
        <div className="relative" ref={menuRef}>
          <Button
            variant="outline"
            onClick={() => {
              setMenuOpen(!menuOpen);
              setDeleteMode(false);
            }}
            className="shrink-0"
          >
            <Settings className="mr-2 h-4 w-4" />
            역할 관리
          </Button>

          {/* 드롭다운 메뉴 */}
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
              {/* 역할 추가 */}
              <button
                className="w-full px-4 py-3 text-left text-sm hover:bg-blue-50 flex items-center gap-2 rounded-t-lg transition-colors"
                onClick={handleAdd}
              >
                <Plus className="h-4 w-4 text-blue-600" />
                <span>역할 추가</span>
              </button>
              {/* 역할 수정 안내 */}
              <button
                className="w-full px-4 py-3 text-left text-sm hover:bg-yellow-50 flex items-center gap-2 border-t border-gray-100 transition-colors"
                onClick={() => {
                  setMenuOpen(false);
                  setDeleteMode(false);
                  alert('수정할 역할의 이름을 길게 누르거나 더블클릭하세요.');
                }}
              >
                <Edit className="h-4 w-4 text-yellow-600" />
                <span>역할 수정</span>
              </button>
              {/* 역할 삭제 모드 토글 */}
              <button
                className="w-full px-4 py-3 text-left text-sm hover:bg-red-50 flex items-center gap-2 border-t border-gray-100 rounded-b-lg transition-colors"
                onClick={() => {
                  setDeleteMode(!deleteMode);
                  setMenuOpen(false);
                }}
              >
                <Trash2 className="h-4 w-4 text-red-600" />
                <span>{deleteMode ? '삭제 모드 끄기' : '역할 삭제'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 삭제 모드 안내 */}
      {deleteMode && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700 flex items-center justify-between">
          <span>삭제할 역할을 클릭하세요. 봉사자가 배정된 역할은 삭제할 수 없습니다.</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteMode(false)}
            className="text-red-700 hover:text-red-900"
          >
            취소
          </Button>
        </div>
      )}

      {/* 역할 토글 목록 */}
      {roles.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <p className="text-gray-500 mb-4">
            아직 등록된 역할이 없습니다
          </p>
          <Button onClick={handleAdd}>
            <Plus className="mr-2 h-4 w-4" />
            첫 번째 역할 추가하기
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          {roles.map((role) => {
            const isToggling = toggling === role.id;
            const isDeleting = deleting === role.id;

            return (
              <button
                key={role.id}
                // 삭제 모드: 클릭 시 삭제, 일반 모드: 클릭 시 토글
                onClick={() => {
                  if (deleteMode) {
                    handleDelete(role);
                  } else {
                    handleToggle(role);
                  }
                }}
                // 더블클릭으로 수정
                onDoubleClick={() => {
                  if (!deleteMode) handleEdit(role);
                }}
                disabled={isToggling || isDeleting}
                className={`
                  relative px-4 py-2.5 rounded-lg font-medium text-sm
                  transition-all duration-200 border-2 cursor-pointer
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${deleteMode
                    ? 'border-red-300 hover:border-red-500 hover:bg-red-50'
                    : role.isActive
                      ? 'text-white shadow-md hover:shadow-lg hover:scale-105'
                      : 'bg-gray-100 text-gray-400 border-gray-200 hover:border-gray-400'
                  }
                `}
                style={
                  !deleteMode && role.isActive
                    ? { backgroundColor: role.color, borderColor: role.color }
                    : undefined
                }
              >
                {/* 역할 이름 */}
                <span className="flex items-center gap-2">
                  {isToggling && <Loader2 className="h-3 w-3 animate-spin" />}
                  {isDeleting && <Loader2 className="h-3 w-3 animate-spin" />}
                  {role.name}
                  {/* 삭제 모드 X 표시 */}
                  {deleteMode && (
                    <Trash2 className="h-3 w-3 text-red-500" />
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* 활성/비활성 역할 요약 */}
      {roles.length > 0 && (
        <div className="text-sm text-gray-500 flex gap-4">
          <span>
            활성: {roles.filter((r) => r.isActive).length}개
          </span>
          <span>
            비활성: {roles.filter((r) => !r.isActive).length}개
          </span>
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
