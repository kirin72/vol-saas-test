/**
 * PWA 설치 프롬프트 컴포넌트
 * - beforeinstallprompt 이벤트 캡처
 * - Android/Chrome: 네이티브 설치 프롬프트 실행
 * - iOS Safari: "홈 화면에 추가" 안내 메시지 표시
 * - 이미 설치된 경우 숨김 처리
 * - 닫기 시 7일간 localStorage로 숨김
 */
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, X, Share } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// 7일 숨김 키
const DISMISS_KEY = 'pwa-install-dismissed';
const DISMISS_DAYS = 7;

/**
 * 설치 배너 (봉사자 대시보드 상단에 표시)
 */
export function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // 이미 설치된 상태인지 확인 (standalone 모드)
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    if (standalone) return;

    // 숨김 기간 확인
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed) {
      const dismissedDate = new Date(dismissed);
      const now = new Date();
      const diffDays =
        (now.getTime() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays < DISMISS_DAYS) return;
    }

    // iOS 감지
    const isIOSDevice =
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    if (isIOSDevice) {
      // iOS는 beforeinstallprompt를 지원하지 않으므로 바로 표시
      setShowBanner(true);
      return;
    }

    // Android/Chrome: beforeinstallprompt 이벤트 캡처
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  // 설치 실행 (Android/Chrome)
  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  // 배너 닫기
  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem(DISMISS_KEY, new Date().toISOString());
  };

  // 이미 설치되었거나 표시 조건 미충족
  if (isStandalone || !showBanner) return null;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 mb-4">
      <div className="flex items-start gap-3">
        {/* 아이콘 */}
        <div className="bg-blue-600 rounded-lg p-2 shrink-0">
          <Download className="h-5 w-5 text-white" />
        </div>

        {/* 텍스트 */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-blue-900 text-sm">
            홈 화면에 앱 추가
          </p>
          {isIOS ? (
            // iOS 안내 메시지
            <p className="text-blue-700 text-xs mt-1">
              Safari 하단의{' '}
              <Share className="inline h-3 w-3" />{' '}
              공유 버튼을 눌러 &quot;홈 화면에 추가&quot;를 선택하세요
            </p>
          ) : (
            // Android/Chrome 설치 버튼
            <p className="text-blue-700 text-xs mt-1">
              바탕화면에서 바로 접속할 수 있어요
            </p>
          )}
        </div>

        {/* 버튼 영역 */}
        <div className="flex items-center gap-2 shrink-0">
          {!isIOS && (
            <Button
              size="sm"
              onClick={handleInstall}
              className="bg-blue-600 hover:bg-blue-700 text-xs"
            >
              설치
            </Button>
          )}
          <button
            type="button"
            onClick={handleDismiss}
            className="text-blue-400 hover:text-blue-600 p-1"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * 설치 버튼 (관리자 드로어에 사용)
 */
export function InstallButton({ compact = false }: { compact?: boolean }) {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showButton, setShowButton] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // 이미 설치된 상태인지 확인
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (standalone) return;

    // iOS 감지
    const isIOSDevice =
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    if (isIOSDevice) {
      setShowButton(true);
      return;
    }

    // beforeinstallprompt 이벤트 캡처
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowButton(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  // 설치 실행
  const handleInstall = async () => {
    if (isIOS) {
      // iOS 안내
      alert(
        '📱 앱 설치 방법\n\n' +
          '1. Safari 하단의 "공유" 버튼(□↑)을 탭\n' +
          '2. "홈 화면에 추가"를 선택\n' +
          '3. "추가"를 탭'
      );
      return;
    }

    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setShowButton(false);
    }
    setDeferredPrompt(null);
  };

  if (!showButton) return null;

  // Compact 모드 (헤더용)
  if (compact) {
    return (
      <Button
        onClick={handleInstall}
        variant="outline"
        size="sm"
        className="gap-1"
      >
        <Download className="w-4 h-4" />
        <span className="hidden sm:inline">앱 설치</span>
      </Button>
    );
  }

  // 기본 모드 (드로어용)
  return (
    <Button
      onClick={handleInstall}
      variant="outline"
      className="w-full min-h-[44px] gap-2"
    >
      <Download className="w-4 h-4" />
      앱 설치하기
    </Button>
  );
}
