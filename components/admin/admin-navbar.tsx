/**
 * 본당 관리자 상단 네비게이션 바
 * 데스크톱: 수평 메뉴 / 모바일: Sheet 드로어
 */
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Tags,
  Copy,
  CalendarDays,
  CalendarCheck,
  Bell,
  Wallet,
  Menu,
  LogOut,
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
}

// 메뉴 아이템 타입
interface MenuItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

// 메뉴 목록
const menuItems: MenuItem[] = [
  {
    href: '/admin/dashboard',
    label: '대시보드',
    icon: LayoutDashboard,
  },
  {
    href: '/admin/volunteers',
    label: '봉사자 관리',
    icon: Users,
  },
  {
    href: '/admin/roles',
    label: '역할 관리',
    icon: Tags,
  },
  {
    href: '/admin/templates',
    label: '미사 템플릿',
    icon: Copy,
  },
  {
    href: '/admin/schedules',
    label: '봉사 일정',
    icon: CalendarDays,
  },
  {
    href: '/admin/assignments',
    label: '봉사자 배정',
    icon: CalendarCheck,
  },
  {
    href: '/admin/requests',
    label: '요청 관리',
    icon: Bell,
  },
  {
    href: '/admin/finance',
    label: '입출금 관리',
    icon: Wallet,
  },
];

export function AdminNavbar({ organizationName, groupName, userName }: AdminNavbarProps) {
  const pathname = usePathname();
  // 모바일 드로어 열림/닫힘 상태
  const [open, setOpen] = useState(false);

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
                  size="icon"
                  className="lg:hidden min-h-[44px] min-w-[44px]"
                  aria-label="메뉴 열기"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>

              {/* 모바일 드로어 (좌측 슬라이드) */}
              <SheetContent side="left" className="w-72 p-0">
                {/* 드로어 헤더: 성당명 + 관리자명 */}
                <SheetHeader className="border-b border-gray-200 p-4">
                  <SheetTitle className="text-left">
                    <span className="text-lg font-bold text-gray-900">
                      {organizationName}성당
                    </span>
                  </SheetTitle>
                  <p className="text-sm text-gray-500 text-left">
                    {groupName ? `${groupName} 관리자` : '관리자'} · {userName}
                  </p>
                </SheetHeader>

                {/* 드로어 메뉴 목록 */}
                <nav className="flex-1 overflow-y-auto py-2">
                  {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;

                    return (
                      <SheetClose asChild key={item.href}>
                        <Link
                          href={item.href}
                          className={cn(
                            // 터치 타겟 44px 이상 보장
                            'flex items-center gap-3 px-4 min-h-[48px] text-sm font-medium transition-colors',
                            isActive
                              ? 'border-l-4 border-blue-600 bg-blue-50 text-blue-700 pl-3'
                              : 'text-gray-700 hover:bg-gray-50 border-l-4 border-transparent pl-3'
                          )}
                        >
                          <Icon className="w-5 h-5 shrink-0" />
                          <span>{item.label}</span>
                        </Link>
                      </SheetClose>
                    );
                  })}
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

            {/* 성당 이름 (반응형 크기) */}
            <h1 className="text-lg sm:text-xl font-bold text-gray-900">
              {organizationName}성당
            </h1>
            {/* 단체명 (sm 이상에서만 표시) */}
            <span className="hidden sm:block text-sm text-gray-500 font-normal">
              {groupName ? `${groupName} 관리자` : '관리자'}
            </span>
          </div>

          {/* 중앙: 데스크톱 메뉴 (lg 이상에서만 표시) */}
          <nav className="hidden lg:flex items-center gap-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors',
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* 오른쪽: 사용자 정보 + 로그아웃 (데스크톱) */}
          <div className="hidden lg:flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {userName}
            </span>
            <Button
              onClick={() => signOut({ callbackUrl: '/auth/login' })}
              variant="outline"
              size="sm"
            >
              로그아웃
            </Button>
          </div>

          {/* 모바일에서는 사용자 이름만 간략 표시 */}
          <span className="lg:hidden text-sm text-gray-600 truncate max-w-[100px]">
            {userName}
          </span>
        </div>
      </div>
    </header>
  );
}
