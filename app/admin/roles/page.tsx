/**
 * 역할 관리 페이지
 * 토글 방식 역할 활성/비활성 + 역할 관리 메뉴 (추가/수정/삭제)
 * - 수정: 역할 선택 → 수정 다이얼로그
 * - 삭제: 역할 체크 선택 → 삭제 버튼으로 일괄 삭제
 */
'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings, Loader2, Plus, Edit, Trash2, Check, X } from 'lucide-react';
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

// 모드 타입: 기본(토글) / 수정 선택 / 삭제 선택
type PageMode = 'default' | 'edit' | 'delete';

export default function RolesPage() {
  const [roles, setRoles] = useState<VolunteerRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toggling, setToggling] = useState<string | null>(null); // 토글 중인 역할 ID
  const [deleting, setDeleting] = useState(false); // 삭제 진행 중

  // 역할 관리 드롭다운 상태
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 다이얼로그 상태
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<VolunteerRole | null>(null);

  // 페이지 모드: 기본 / 수정 / 삭제
  const [mode, setMode] = useState<PageMode>('default');

  // 삭제 모드에서 선택된 역할 ID 목록
  const [selectedForDelete, setSelectedForDelete] = useState<Set<string>>(new Set());

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

  // 수정 모드 진입
  const handleEnterEditMode = () => {
    setMode('edit');
    setMenuOpen(false);
  };

  // 수정 모드에서 역할 클릭 → 수정 다이얼로그
  const handleEdit = (role: VolunteerRole) => {
    setEditingRole(role);
    setDialogOpen(true);
    setMode('default'); // 수정 다이얼로그 열면 모드 복귀
  };

  // 삭제 모드 진입
  const handleEnterDeleteMode = () => {
    setMode('delete');
    setSelectedForDelete(new Set());
    setMenuOpen(false);
  };

  // 삭제 모드에서 역할 체크/해제 토글
  const toggleDeleteSelection = (roleId: string) => {
    setSelectedForDelete((prev) => {
      const next = new Set(prev);
      if (next.has(roleId)) {
        next.delete(roleId);
      } else {
        next.add(roleId);
      }
      return next;
    });
  };

  // 선택된 역할 일괄 삭제
  const handleBulkDelete = async () => {
    if (selectedForDelete.size === 0) {
      alert('삭제할 역할을 선택해주세요.');
      return;
    }

    // 봉사자가 있는 역할 확인
    const selectedRoles = roles.filter((r) => selectedForDelete.has(r.id));
    const hasVolunteers = selectedRoles.filter((r) => r._count.userRoles > 0);

    if (hasVolunteers.length > 0) {
      const names = hasVolunteers.map((r) => `${r.name}(${r._count.userRoles}명)`).join(', ');
      alert(`봉사자가 배정된 역할은 삭제할 수 없습니다.\n해당 역할: ${names}\n\n먼저 봉사자의 역할을 변경해주세요.`);
      return;
    }

    // 삭제 확인
    const names = selectedRoles.map((r) => r.name).join(', ');
    if (!confirm(`다음 역할을 삭제하시겠습니까?\n\n${names}`)) {
      return;
    }

    setDeleting(true);

    try {
      // 선택된 역할 순차 삭제
      for (const roleId of selectedForDelete) {
        const response = await fetch(`/api/admin/roles/${roleId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || '역할 삭제 실패');
        }
      }

      alert(`${selectedForDelete.size}개 역할이 삭제되었습니다.`);
      // 삭제 완료 후 기본 모드로 돌아가고 목록 새로고침
      setMode('default');
      setSelectedForDelete(new Set());
      fetchRoles();
    } catch (err: any) {
      alert(`삭제 오류: ${err.message}`);
    } finally {
      setDeleting(false);
    }
  };

  // 모드 취소 → 기본 모드로 복귀
  const handleCancelMode = () => {
    setMode('default');
    setSelectedForDelete(new Set());
  };

  // 다이얼로그 저장 완료 후
  const handleDialogSuccess = () => {
    setDialogOpen(false);
    fetchRoles();
  };

  // 역할 클릭 핸들러 (모드별 분기)
  const handleRoleClick = (role: VolunteerRole) => {
    if (mode === 'delete') {
      toggleDeleteSelection(role.id);
    } else if (mode === 'edit') {
      handleEdit(role);
    } else {
      handleToggle(role);
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
      <div className="space-y-3">
        {/* 제목 + 역할 관리 버튼 (같은 줄) */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">봉사 역할 관리</h1>

          {/* 역할 관리 드롭다운 버튼 — 기본 모드에서만 표시 */}
          {mode === 'default' && (
            <div className="relative" ref={menuRef}>
              <Button
                variant="outline"
                onClick={() => setMenuOpen(!menuOpen)}
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
                  {/* 역할 수정 */}
                  <button
                    className="w-full px-4 py-3 text-left text-sm hover:bg-yellow-50 flex items-center gap-2 border-t border-gray-100 transition-colors"
                    onClick={handleEnterEditMode}
                  >
                    <Edit className="h-4 w-4 text-yellow-600" />
                    <span>역할 수정</span>
                  </button>
                  {/* 역할 삭제 */}
                  <button
                    className="w-full px-4 py-3 text-left text-sm hover:bg-red-50 flex items-center gap-2 border-t border-gray-100 rounded-b-lg transition-colors"
                    onClick={handleEnterDeleteMode}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                    <span>역할 삭제</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 안내 문구 (제목 아래 별도 줄) */}
        <p className="text-gray-600">
          역할을 클릭하여 활성/비활성을 전환하세요.
        </p>
        <p className="text-sm text-gray-500">
          역할의 추가/수정은 &apos;역할 관리&apos; 버튼을 눌러주세요.
        </p>
        <p className="text-sm text-gray-500">
        &quot;자동 배정&quot;용 성별 우선배정은 &quot;역할 수정&quot;에서 변경할 수 있습니다.
        </p>
      </div>

      {/* 수정 모드 안내 */}
      {mode === 'edit' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm text-yellow-700 flex items-center justify-between">
          <span>수정할 역할을 선택하세요.</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancelMode}
            className="text-yellow-700 hover:text-yellow-900"
          >
            <X className="h-4 w-4 mr-1" />
            취소
          </Button>
        </div>
      )}

      {/* 삭제 모드 안내 */}
      {mode === 'delete' && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700 flex items-center justify-between">
          <span>
            삭제할 역할을 선택하세요.
            {selectedForDelete.size > 0 && (
              <strong className="ml-1">{selectedForDelete.size}개 선택됨</strong>
            )}
          </span>
          <div className="flex gap-2">
            {/* 선택된 항목이 있으면 삭제 버튼 표시 */}
            {selectedForDelete.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-1" />
                )}
                {deleting ? '삭제 중...' : `${selectedForDelete.size}개 삭제`}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancelMode}
              className="text-red-700 hover:text-red-900"
              disabled={deleting}
            >
              <X className="h-4 w-4 mr-1" />
              취소
            </Button>
          </div>
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
            const isSelectedForDelete = selectedForDelete.has(role.id);

            return (
              <button
                key={role.id}
                onClick={() => handleRoleClick(role)}
                disabled={isToggling || deleting}
                className={`
                  relative px-4 py-2.5 rounded-lg font-medium text-sm
                  transition-all duration-200 border-2 cursor-pointer
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${mode === 'delete'
                    ? isSelectedForDelete
                      ? 'border-red-500 bg-red-100 text-red-800 ring-2 ring-red-300'
                      : 'border-red-200 hover:border-red-400 hover:bg-red-50'
                    : mode === 'edit'
                      ? 'border-yellow-300 hover:border-yellow-500 hover:bg-yellow-50'
                      : role.isActive
                        ? 'text-white shadow-md hover:shadow-lg hover:scale-105'
                        : 'bg-gray-100 text-gray-400 border-gray-200 hover:border-gray-400'
                  }
                `}
                style={
                  mode === 'default' && role.isActive
                    ? { backgroundColor: role.color, borderColor: role.color }
                    : undefined
                }
              >
                {/* 역할 이름 */}
                <span className="flex items-center gap-2">
                  {isToggling && <Loader2 className="h-3 w-3 animate-spin" />}
                  {role.name}
                  {/* 삭제 모드: 체크 표시 */}
                  {mode === 'delete' && isSelectedForDelete && (
                    <Check className="h-3 w-3 text-red-600" />
                  )}
                  {/* 수정 모드: 편집 아이콘 */}
                  {mode === 'edit' && (
                    <Edit className="h-3 w-3 text-yellow-600" />
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* 활성/비활성 역할 요약 — 기본 모드에서만 표시 */}
      {roles.length > 0 && mode === 'default' && (
        <div className="flex gap-3">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
            <span className="text-sm font-medium text-green-700">
              활성 {roles.filter((r) => r.isActive).length}개
            </span>
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg">
            <span className="w-2.5 h-2.5 rounded-full bg-gray-400" />
            <span className="text-sm font-medium text-gray-500">
              비활성 {roles.filter((r) => !r.isActive).length}개
            </span>
          </div>
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
