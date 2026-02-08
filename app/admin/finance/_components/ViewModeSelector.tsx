/**
 * 보기 모드 선택 컴포넌트
 * 월별/년간/전체 보기 전환 버튼
 */
'use client';

import { Button } from '@/components/ui/button';

// 보기 모드 타입
export type ViewMode = 'monthly' | 'yearly' | 'all';

interface ViewModeSelectorProps {
  viewMode: ViewMode; // 현재 선택된 모드
  onViewModeChange: (mode: ViewMode) => void; // 모드 변경 콜백
}

export function ViewModeSelector({
  viewMode,
  onViewModeChange,
}: ViewModeSelectorProps) {
  return (
    <div className="flex gap-2">
      {/* 월별 보기 버튼 */}
      <Button
        variant={viewMode === 'monthly' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onViewModeChange('monthly')}
      >
        월별
      </Button>

      {/* 년간 보기 버튼 */}
      <Button
        variant={viewMode === 'yearly' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onViewModeChange('yearly')}
      >
        년간
      </Button>

      {/* 전체 보기 버튼 */}
      <Button
        variant={viewMode === 'all' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onViewModeChange('all')}
      >
        전체
      </Button>
    </div>
  );
}
