/**
 * 처음 가입한 관리자에게 표시되는 웰컴 배너
 * isFirstLogin이 true인 ADMIN에게만 표시
 * X 버튼 클릭 시 /api/auth/update-first-login 호출 후 배너 숨김
 */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, X, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WelcomeBannerProps {
  // 첫 로그인 여부 (서버에서 전달)
  isFirstLogin: boolean;
}

export function WelcomeBanner({ isFirstLogin }: WelcomeBannerProps) {
  const router = useRouter();
  // 배너 표시 상태 (로컬)
  const [visible, setVisible] = useState(isFirstLogin);

  // 첫 로그인이 아니거나 이미 닫힌 경우 렌더링 안 함
  if (!visible) return null;

  // 배너 닫기: API 호출로 isFirstLogin을 false로 업데이트
  const handleDismiss = async () => {
    // 즉시 배너 숨김 (UI 반응성)
    setVisible(false);
    try {
      // 서버에 isFirstLogin = false 업데이트 요청
      await fetch('/api/auth/update-first-login', {
        method: 'POST',
      });
    } catch (error) {
      // API 실패해도 배너는 숨김 유지 (다음 로그인 시 다시 표시됨)
      console.error('isFirstLogin 업데이트 실패:', error);
    }
  };

  // "사용 방법 보기" 클릭 → 가이드 페이지로 이동 + 배너 닫기
  const handleGuideClick = async () => {
    // 먼저 API 호출하여 isFirstLogin 업데이트
    handleDismiss();
    // 가이드 페이지로 이동
    router.push('/admin/setup-guide');
  };

  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 sm:p-6 shadow-lg">
      {/* X 닫기 버튼 (우측 상단) */}
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1 rounded-full hover:bg-white/20 transition-colors"
        aria-label="배너 닫기"
      >
        <X className="w-5 h-5" />
      </button>

      {/* 배너 콘텐츠 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pr-8">
        {/* 아이콘 */}
        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
          <Sparkles className="w-6 h-6" />
        </div>

        {/* 텍스트 */}
        <div className="flex-1 space-y-1">
          <h2 className="text-lg sm:text-xl font-bold">
            환영합니다! 봉사 관리를 시작해 보세요
          </h2>
          <p className="text-sm text-blue-100">
            처음 사용하시는 분을 위한 초기 설정 안내를 준비했습니다.
            역할, 봉사자, 미사 템플릿을 순서대로 설정해 보세요.
          </p>
        </div>

        {/* CTA 버튼 */}
        <Button
          onClick={handleGuideClick}
          variant="secondary"
          className="flex-shrink-0 min-h-[44px] gap-2 bg-white text-blue-700 hover:bg-blue-50 font-semibold"
        >
          사용 방법 보기
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
