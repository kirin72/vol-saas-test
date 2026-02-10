/**
 * 미사 템플릿 관리 페이지
 * 템플릿 CRUD, 활성화 토글, 월간 일정 자동 생성
 */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  PlusCircle,
  Edit,
  Trash2,
  Loader2,
  Power,
  CalendarPlus,
  Clock,
  Repeat,
} from 'lucide-react';
import TemplateDialog from '@/components/templates/template-dialog';
import GenerateSchedulesDialog from '@/components/templates/generate-schedules-dialog';
import { massTypeLabels } from '@/lib/validations/schedule';
import { dayOfWeekLabels, vestmentColorLabels, vestmentColorCodes } from '@/lib/validations/template';

// 템플릿 타입
interface MassTemplate {
  id: string;
  name: string;
  massType: string;
  dayOfWeek: string | string[] | null;
  time: string;
  vestmentColor: string | null;
  isActive: boolean;
  createdAt: string;
  slots: Array<{
    id: string;
    volunteerRoleId: string;
    requiredCount: number;
    volunteerRole: {
      id: string;
      name: string;
      color: string;
      sortOrder: number;
    };
  }>;
  _count: {
    massSchedules: number;
  };
}

export default function TemplatesPage() {
  const router = useRouter();
  // 템플릿 목록
  const [templates, setTemplates] = useState<MassTemplate[]>([]);
  // 로딩/에러 상태
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // 삭제/토글 진행 중인 템플릿 ID
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  // 추가/수정 다이얼로그 상태
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MassTemplate | null>(null);

  // 월간 일정 생성 다이얼로그 상태
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [generatingTemplate, setGeneratingTemplate] = useState<MassTemplate | null>(null);

  // 역할 목록 (템플릿 추가 시 역할 존재 여부 확인용)
  const [roles, setRoles] = useState<{ id: string }[]>([]);

  // 초기 로드
  useEffect(() => {
    fetchTemplates();
    fetchRoles();
  }, []);

  // 템플릿 목록 조회
  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/templates');
      if (!response.ok) throw new Error('템플릿 조회 실패');
      const data = await response.json();
      setTemplates(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 역할 목록 조회 (역할 존재 여부 확인용)
  const fetchRoles = async () => {
    try {
      const res = await fetch('/api/admin/roles');
      if (res.ok) {
        const data = await res.json();
        setRoles(data);
      }
    } catch (err) {
      console.error('역할 목록 조회 실패:', err);
    }
  };

  // 템플릿 추가 다이얼로그 열기 (역할 존재 여부 확인)
  const handleAdd = () => {
    if (roles.length === 0) {
      alert('역할을 먼저 등록해 주세요!');
      router.push('/admin/roles');
      return;
    }
    setEditingTemplate(null);
    setDialogOpen(true);
  };

  // 템플릿 수정 다이얼로그 열기
  const handleEdit = (template: MassTemplate) => {
    setEditingTemplate(template);
    setDialogOpen(true);
  };

  // 활성/비활성 토글
  const handleToggleActive = async (template: MassTemplate) => {
    setToggling(template.id);

    try {
      const response = await fetch(
        `/api/admin/templates/${template.id}/toggle-active`,
        { method: 'PATCH' }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '활성 상태 변경 실패');
      }

      fetchTemplates(); // 목록 새로고침
    } catch (err: any) {
      alert(`활성 상태 변경 오류: ${err.message}`);
    } finally {
      setToggling(null);
    }
  };

  // 템플릿 삭제
  const handleDelete = async (template: MassTemplate) => {
    // 연결된 일정이 있으면 경고
    if (template._count.massSchedules > 0) {
      alert(
        `이 템플릿을 사용하는 일정이 ${template._count.massSchedules}개 있어 삭제할 수 없습니다.\n먼저 관련 일정을 삭제해주세요.`
      );
      return;
    }

    if (!confirm(`정말 "${template.name}" 템플릿을 삭제하시겠습니까?`)) {
      return;
    }

    setDeleting(template.id);

    try {
      const response = await fetch(`/api/admin/templates/${template.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '템플릿 삭제 실패');
      }

      alert('템플릿이 삭제되었습니다');
      fetchTemplates();
    } catch (err: any) {
      alert(`삭제 오류: ${err.message}`);
    } finally {
      setDeleting(null);
    }
  };

  // 월간 일정 생성 다이얼로그 열기
  const handleGenerateSchedules = (template: MassTemplate) => {
    setGeneratingTemplate(template);
    setGenerateDialogOpen(true);
  };

  // 다이얼로그 저장 완료
  const handleDialogSuccess = () => {
    setDialogOpen(false);
    fetchTemplates();
  };

  // 일정 생성 완료
  const handleGenerateSuccess = () => {
    setGenerateDialogOpen(false);
    fetchTemplates();
  };

  // 로딩 상태
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
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
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">미사 템플릿 관리</h1>
          <p className="text-gray-600 mt-2">
            총 {templates.length}개의 템플릿이 등록되어 있습니다
          </p>
        </div>
        <Button onClick={handleAdd} className="shrink-0">
          <PlusCircle className="mr-2 h-4 w-4" />
          템플릿 추가
        </Button>
      </div>

      {/* 안내 메시지 */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4 text-sm text-blue-700">
        <strong>미사 템플릿이란?</strong> 반복되는 미사 유형(예: 주일 오전 10시 미사)을 템플릿으로 저장하여,
        매월 일정을 자동으로 생성할 수 있습니다. 반복 요일을 설정한 후 &quot;일정 생성&quot; 버튼을 클릭하세요.
      </div>

      {/* 템플릿 목록 */}
      {templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-gray-500 mb-4">
              아직 등록된 템플릿이 없습니다
            </p>
            <Button onClick={handleAdd}>
              <PlusCircle className="mr-2 h-4 w-4" />
              첫 번째 템플릿 추가하기
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card
              key={template.id}
              className={`hover:shadow-lg transition-shadow ${
                !template.isActive ? 'opacity-60' : ''
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    {/* 템플릿 이름 */}
                    <h3 className="font-semibold text-lg">{template.name}</h3>
                    {/* 미사 종류 + 제의 색상 + 비활성 뱃지 */}
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant="outline">
                        {massTypeLabels[template.massType] || template.massType}
                      </Badge>
                      {/* 제의 색상 (선택된 경우에만 표시) */}
                      {template.vestmentColor && (
                        <Badge
                          variant="outline"
                          className="flex items-center gap-1"
                        >
                          <span
                            className={`inline-block w-3 h-3 rounded-full shrink-0 ${
                              template.vestmentColor === 'WHITE' ? 'border border-gray-300' : ''
                            }`}
                            style={{ backgroundColor: vestmentColorCodes[template.vestmentColor] }}
                          />
                          {vestmentColorLabels[template.vestmentColor]}
                        </Badge>
                      )}
                      {!template.isActive && (
                        <Badge variant="secondary">비활성</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* 요일 + 시간 */}
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  {template.dayOfWeek && (
                    <div className="flex items-center gap-1">
                      <Repeat className="h-4 w-4" />
                      <span>매주 {
                        Array.isArray(template.dayOfWeek)
                          ? template.dayOfWeek.map((d) => dayOfWeekLabels[d] || d).join(', ')
                          : dayOfWeekLabels[template.dayOfWeek] || template.dayOfWeek
                      }</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{template.time}</span>
                  </div>
                </div>

                {/* 역할 목록 */}
                <div className="flex flex-wrap gap-1">
                  {template.slots
                    .sort((a, b) => (a.volunteerRole.sortOrder ?? 999) - (b.volunteerRole.sortOrder ?? 999))
                    .map((slot) => (
                      <Badge
                        key={slot.id}
                        style={{
                          backgroundColor: slot.volunteerRole.color,
                          color: 'white',
                        }}
                        className="text-xs"
                      >
                        {slot.volunteerRole.name}
                        {slot.requiredCount > 1 && ` ×${slot.requiredCount}`}
                      </Badge>
                    ))}
                </div>

                {/* 사용 중인 일정 수 */}
                <div className="text-xs text-gray-500">
                  사용 중인 일정: {template._count.massSchedules}개
                </div>

                {/* 월간 일정 생성 버튼 */}
                {template.isActive && template.dayOfWeek && (Array.isArray(template.dayOfWeek) ? template.dayOfWeek.length > 0 : true) && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => handleGenerateSchedules(template)}
                  >
                    <CalendarPlus className="h-4 w-4 mr-1" />
                    월간 일정 생성
                  </Button>
                )}

                {/* 활성화 토글 + 수정/삭제 버튼 */}
                <div className="flex gap-2">
                  <Button
                    variant={template.isActive ? 'default' : 'secondary'}
                    size="sm"
                    onClick={() => handleToggleActive(template)}
                    disabled={toggling === template.id}
                    className="flex-1"
                  >
                    <Power className="h-4 w-4 mr-1" />
                    {toggling === template.id
                      ? '처리 중...'
                      : template.isActive
                      ? '활성'
                      : '비활성'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(template)}
                    className="flex-1"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    수정
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(template)}
                    disabled={deleting === template.id}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    {deleting === template.id ? '...' : '삭제'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 템플릿 추가/수정 다이얼로그 */}
      <TemplateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        template={editingTemplate}
        onSuccess={handleDialogSuccess}
      />

      {/* 월간 일정 생성 다이얼로그 */}
      <GenerateSchedulesDialog
        open={generateDialogOpen}
        onOpenChange={setGenerateDialogOpen}
        template={generatingTemplate}
        onSuccess={handleGenerateSuccess}
      />
    </div>
  );
}
