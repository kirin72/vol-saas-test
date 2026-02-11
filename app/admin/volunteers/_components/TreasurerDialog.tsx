/**
 * 총무 선택/변경 Dialog
 * - 봉사자 목록에서 총무를 선택하거나 해제
 * - 부모 컴포넌트에서 봉사자 목록을 props로 전달받음
 */
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { setTreasurer } from '@/lib/actions/treasurer';

interface TreasurerDialogProps {
  open: boolean; // Dialog 열림 상태
  onOpenChange: (open: boolean) => void; // Dialog 상태 변경
  volunteers: { id: string; name: string; baptismalName: string | null }[]; // 봉사자 목록
  currentTreasurerId: string | null; // 현재 총무 ID
  onSuccess: () => void; // 성공 시 콜백 (데이터 갱신)
}

export function TreasurerDialog({
  open,
  onOpenChange,
  volunteers,
  currentTreasurerId,
  onSuccess,
}: TreasurerDialogProps) {
  // 선택된 봉사자 ID (빈 문자열 = "없음")
  const [selectedId, setSelectedId] = useState<string>(currentTreasurerId || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Dialog 열릴 때 현재 총무 ID로 초기화
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setSelectedId(currentTreasurerId || '');
      setError('');
    }
    onOpenChange(isOpen);
  };

  // 저장 처리
  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');

      // 빈 문자열이면 null (해제), 아니면 봉사자 ID
      const userId = selectedId || null;
      const result = await setTreasurer(userId);

      if (!result.success) {
        setError(result.error || '저장에 실패했습니다.');
        return;
      }

      // 성공 시 Dialog 닫고 부모에게 알림
      onOpenChange(false);
      onSuccess();
    } catch {
      setError('저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>총무 지정</DialogTitle>
          <DialogDescription>
            입출금 관리를 담당할 총무를 선택해주세요.
            총무는 봉사자 로그인에서 입출금 관리에 접근할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 봉사자 선택 드롭다운 */}
          <div className="space-y-2">
            <Label htmlFor="treasurer-select">총무 선택</Label>
            <select
              id="treasurer-select"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={saving}
            >
              {/* 없음 (총무 해제) */}
              <option value="">없음 (총무 해제)</option>
              {/* 봉사자 목록 */}
              {volunteers.map((vol) => (
                <option key={vol.id} value={vol.id}>
                  {vol.name}
                  {vol.baptismalName ? ` (${vol.baptismalName})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            취소
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                저장 중...
              </>
            ) : (
              '저장'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
