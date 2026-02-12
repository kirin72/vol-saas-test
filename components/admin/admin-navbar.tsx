/**
 * 본당 관리자 상단 네비게이션 바
 * 데스크톱: 수평 메뉴 / 모바일: Sheet 드로어
 */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Users,
  Tags,
  CalendarDays,
  CalendarCheck,
  Bell,
  Wallet,
  ClipboardList,
  HelpCircle,
  Menu,
  LogOut,
  Clock,
  Sparkles,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from '@/components/ui/sheet';
import { signOut } from 'next-auth/react';
import { InstallButton } from '@/components/pwa/install-prompt';

interface AdminNavbarProps {
  organizationName: string;
  groupName: string | null;
  userName: string;
  baptismalName: string | null;
}

// 메뉴 아이템 타입
interface MenuItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isPremium?: boolean; // 프리미엄 기능 표시
}

// 메뉴 그룹 타입
interface MenuGroup {
  title: string;
  items: MenuItem[];
}

// 메뉴 목록 (그룹별로 구성)
const menuGroups: MenuGroup[] = [
  {
    title: '운영',
    items: [
      { href: '/admin/dashboard', label: '대시보드', icon: Home },
      { href: '/admin/mass-times', label: '미사일정', icon: Clock },
      { href: '/admin/assignments', label: '봉사자배정', icon: CalendarCheck },
      { href: '/admin/requests', label: '요청관리', icon: Bell },
    ],
  },
  {
    title: '봉사자 관리',
    items: [
      { href: '/admin/roles', label: '봉사역할관리', icon: Tags },
      { href: '/admin/volunteers', label: '봉사자관리', icon: Users },
    ],
  },
  {
    title: '회계',
    items: [
      { href: '/admin/finance', label: '입출금관리', icon: Wallet },
    ],
  },
  {
    title: '자동화 · 분석',
    items: [
      { href: '/admin/automation', label: '운영자동화', icon: Sparkles, isPremium: true },
      { href: '/admin/reports', label: '통계리포트', icon: BarChart3, isPremium: true },
    ],
  },
  {
    title: '개인',
    items: [
      { href: '/admin/my-assignments', label: '나의봉사현황', icon: ClipboardList },
    ],
  },
  {
    title: '도움',
    items: [
      { href: '/admin/setup-guide', label: '초기 설정 방법', icon: HelpCircle },
    ],
  },
];

// 플랫 메뉴 목록 (데스크톱용)
const flatMenuItems: MenuItem[] = menuGroups.flatMap(group => group.items);

export function AdminNavbar({ organizationName, groupName, userName, baptismalName }: AdminNavbarProps) {
  const pathname = usePathname();
  // 모바일 드로어 열림/닫힘 상태
  const [open, setOpen] = useState(false);
  // '메뉴' 텍스트 표시 여부 (일주일간)
  const [showMenuText, setShowMenuText] = useState(false);

  useEffect(() => {
    // localStorage에서 첫 로그인 시간 확인
    const firstLoginTime = localStorage.getItem('firstLoginTime');
    const now = Date.now();

    if (!firstLoginTime) {
      // 첫 로그인이면 현재 시간 저장
      localStorage.setItem('firstLoginTime', now.toString());
      setShowMenuText(true);
    } else {
      // 일주일(7일) 경과 여부 확인
      const oneWeek = 7 * 24 * 60 * 60 * 1000; // 밀리초
      const elapsed = now - parseInt(firstLoginTime);
      setShowMenuText(elapsed < oneWeek);
    }
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* 왼쪽: 햄버거 버튼 (모바일) + 성당 이름 + 단체명 */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* 모바일 햄버거 메뉴 버튼 */}
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  className="lg:hidden min-h-[44px] gap-1 px-2"
                  aria-label="메뉴 열기"
                >
                  <Menu className="h-5 w-5" />
                  {showMenuText && <span className="text-sm font-medium">메뉴</span>}
                </Button>
              </SheetTrigger>

              {/* 모바일 드로어 (좌측 슬라이드) */}
              <SheetContent side="left" className="w-72 p-0">
                {/* 드로어 헤더: 성당명 + 관리자명 */}
                <SheetHeader className="border-b border-gray-200 p-4">
                  <SheetTitle className="text-left">
                    <span className="text-lg font-bold text-gray-900">
                      {organizationName}
                    </span>
                  </SheetTitle>
                  <p className="text-sm text-gray-500 text-left">
                    {groupName ? `${groupName} 관리자` : '관리자'} · {userName}{baptismalName ? ` ${baptismalName}` : ''}
                  </p>
                </SheetHeader>

                {/* 드로어 메뉴 목록 (그룹별) */}
                <nav className="flex-1 overflow-y-auto py-2">
                  {menuGroups.map((group, groupIndex) => (
                    <div key={group.title}>
                      {/* 그룹 제목 */}
                      <div className="px-4 pt-4 pb-2">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          {group.title}
                        </h3>
                      </div>

                      {/* 그룹 메뉴 항목 */}
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;

                        return (
                          <SheetClose asChild key={item.href}>
                            <Link
                              href={item.href}
                              className={cn(
                                // 터치 타겟 44px 이상 보장
                                'flex items-center gap-3 px-4 min-h-[44px] text-sm font-medium transition-colors',
                                isActive
                                  ? 'border-l-4 border-blue-600 bg-blue-50 text-blue-700 pl-3'
                                  : 'text-gray-700 hover:bg-gray-50 border-l-4 border-transparent pl-3'
                              )}
                            >
                              <Icon className="w-5 h-5 shrink-0" />
                              <span className="flex-1">{item.label}</span>
                              {item.isPremium && (
                                <Sparkles className="w-4 h-4 text-yellow-500" />
                              )}
                            </Link>
                          </SheetClose>
                        );
                      })}

                      {/* 그룹 구분선 (마지막 그룹 제외) */}
                      {groupIndex < menuGroups.length - 1 && (
                        <div className="my-2 border-t border-gray-200" />
                      )}
                    </div>
                  ))}
                </nav>

                {/* 드로어 하단: 앱 설치 + 로그아웃 버튼 */}
                <div className="mt-auto border-t border-gray-200 p-4 space-y-2">
                  {/* PWA 앱 설치 버튼 */}
                  <InstallButton />
                  <Button
                    onClick={() => signOut({ callbackUrl: '/auth/login' })}
                    variant="outline"
                    className="w-full min-h-[44px] gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    로그아웃
                  </Button>
                </div>
              </SheetContent>
            </Sheet>

            {/* 성당 이름 (반응형 크기, 클릭 시 대시보드로 이동) */}
            <Link href="/admin/dashboard">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors cursor-pointer">
                {organizationName}
              </h1>
            </Link>
            {/* 단체명 (sm 이상에서만 표시) */}
            <span className="hidden sm:block text-sm text-gray-500 font-normal">
              {groupName ? `${groupName} 관리자` : '관리자'}
            </span>
          </div>

          {/* 중앙: 데스크톱 메뉴 (lg 이상에서만 표시) */}
          <nav className="hidden lg:flex items-center gap-1 overflow-x-auto">
            {flatMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap',
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                  {item.isPremium && (
                    <Sparkles className="w-3 h-3 text-yellow-400" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* 오른쪽: 사용자 정보 + 앱 설치 + 로그아웃 (데스크톱) */}
          <div className="hidden lg:flex items-center gap-3">
            <span className="text-sm text-gray-600">
              {userName}{baptismalName ? ` ${baptismalName}` : ''}
            </span>
            {/* 앱 설치 버튼 */}
            <InstallButton compact />
            <Button
              onClick={() => signOut({ callbackUrl: '/auth/login' })}
              variant="outline"
              size="sm"
            >
              로그아웃
            </Button>
          </div>

          {/* 모바일에서는 사용자 이름만 간략 표시 */}
          <span className="lg:hidden text-sm text-gray-600 truncate max-w-[140px]">
            {userName}{baptismalName ? ` ${baptismalName}` : ''}
          </span>
        </div>
      </div>
    </header>
  );
}
