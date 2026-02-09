/**
 * 역할 추가/수정 다이얼로그
 */
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { roleCreateSchema, type RoleCreateInput, colorPresets } from '@/lib/validations/role';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';

interface RoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role?: {
    id: string;
    name: string;
    description: string | null;
    color: string;
    sortOrder: number;
    genderPreference: string;
    isActive: boolean;
  } | null;
  onSuccess: () => void;
}

export default function RoleDialog({
  open,
  onOpenChange,
  role,
  onSuccess,
}: RoleDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isEditing = !!role;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RoleCreateInput>({
    resolver: zodResolver(roleCreateSchema),
    defaultValues: {
      name: '',
      description: '',
      color: colorPresets[0].value,
      sortOrder: 0,
      genderPreference: 'NONE',
      isActive: true,
    },
  });

  const selectedColor = watch('color');

  // 다이얼로그가 열릴 때 폼 초기화
  useEffect(() => {
    if (open) {
      if (role) {
        reset({
          name: role.name,
          description: role.description || '',
          color: role.color,
          sortOrder: role.sortOrder,
          genderPreference: (role.genderPreference as 'NONE' | 'MALE_PREFERRED' | 'FEMALE_PREFERRED') || 'NONE',
          isActive: role.isActive,
        });
      } else {
        reset({
          name: '',
          description: '',
          color: colorPresets[0].value,
          sortOrder: 0,
          genderPreference: 'NONE',
          isActive: true,
        });
      }
      setError('');
    }
  }, [open, role, reset]);

  // 폼 제출
  const onSubmit = async (data: RoleCreateInput) => {
    setLoading(true);
    setError('');

    try {
      const url = isEditing ? `/api/admin/roles/${role.id}` : '/api/admin/roles';
      const method = isEditing ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        onSuccess();
      } else {
        const errorData = await res.json();
        setError(errorData.error || '역할 저장에 실패했습니다');
      }
    } catch (error) {
      console.error('역할 저장 오류:', error);
      setError('역할 저장 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? '역할 수정' : '새 역할 추가'}
          </DialogTitle>
          <DialogDescription>
            봉사 역할 정보를 입력해주세요
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* 역할명 */}
          <div className="space-y-2">
            <Label htmlFor="name">역할명 *</Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="1독서, 2독서, 해설, 제대봉사 등"
              disabled={loading}
            />
            {errors.name && (
              <p className="text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          {/* 설명 */}
          <div className="space-y-2">
            <Label htmlFor="description">설명</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="역할에 대한 간단한 설명"
              rows={3}
              disabled={loading}
            />
            {errors.description && (
              <p className="text-sm text-red-600">{errors.description.message}</p>
            )}
          </div>

          {/* 색상 선택 */}
          <div className="space-y-2">
            <Label>색상 *</Label>
            <div className="grid grid-cols-4 gap-2">
              {colorPresets.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setValue('color', preset.value)}
                  className={`h-12 rounded-md border-2 transition-all ${
                    selectedColor === preset.value
                      ? 'border-gray-900 ring-2 ring-gray-300'
                      : 'border-gray-200 hover:border-gray-400'
                  }`}
                  style={{ backgroundColor: preset.value }}
                  title={preset.name}
                  disabled={loading}
                />
              ))}
            </div>
            {/* 선택된 색상 미리보기 */}
            <div className="flex items-center gap-2 mt-2">
              <div
                className="px-3 py-1 rounded text-white font-medium text-sm"
                style={{ backgroundColor: selectedColor }}
              >
                미리보기
              </div>
              <code className="text-xs text-gray-500">{selectedColor}</code>
            </div>
            {errors.color && (
              <p className="text-sm text-red-600">{errors.color.message}</p>
            )}
          </div>

          {/* 성별 우선 배정 */}
          <div className="space-y-2">
            <Label htmlFor="genderPreference">성별 우선 배정</Label>
            <select
              id="genderPreference"
              {...register('genderPreference')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            >
              <option value="NONE">성별 무관</option>
              <option value="MALE_PREFERRED">남성 우선</option>
              <option value="FEMALE_PREFERRED">여성 우선</option>
            </select>
            <p className="text-xs text-gray-500">
              자동배정 시 해당 성별 봉사자에게 우선 배정됩니다
            </p>
          </div>

          {/* 수정 모드일 때만 정렬 순서와 활성 상태 표시 */}
          {isEditing && (
            <>
              {/* 정렬 순서 */}
              <div className="space-y-2">
                <Label htmlFor="sortOrder">정렬 순서</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  {...register('sortOrder', { valueAsNumber: true })}
                  placeholder="0"
                  disabled={loading}
                />
                <p className="text-xs text-gray-500">
                  작은 숫자가 먼저 표시됩니다
                </p>
                {errors.sortOrder && (
                  <p className="text-sm text-red-600">{errors.sortOrder.message}</p>
                )}
              </div>

              {/* 활성 상태 */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isActive"
                  {...register('isActive')}
                  className="w-4 h-4 rounded border-gray-300"
                  disabled={loading}
                />
                <Label htmlFor="isActive" className="cursor-pointer">
                  역할 활성화 (비활성화 시 선택 불가)
                </Label>
              </div>
            </>
          )}

          {/* 에러 메시지 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* 버튼 */}
          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? '저장 중...' : isEditing ? '수정' : '추가'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              취소
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
