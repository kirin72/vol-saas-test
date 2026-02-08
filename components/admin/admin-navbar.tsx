/**
 * 본당 관리자 상단 네비게이션 바
 * 성당명, 메뉴, 로그아웃을 하나의 고정 헤더로 통합
 */
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Tags,
  CalendarDays,
  CalendarCheck,
  Bell,
  Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { signOut } from 'next-auth/react';

interface AdminNavbarProps {
  organizationName: string;
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

export function AdminNavbar({ organizationName, userName }: AdminNavbarProps) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* 왼쪽: 성당 이름 */}
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900">
              {organizationName}
            </h1>
            <span className="hidden sm:block text-sm text-gray-500 font-normal">
              본당 관리자
            </span>
          </div>

          {/* 중앙: 메뉴 (수평 배치) */}
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

          {/* 오른쪽: 사용자 정보 + 로그아웃 */}
          <div className="flex items-center gap-4">
            <span className="hidden sm:block text-sm text-gray-600">
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
        </div>

        {/* 모바일 메뉴 (lg 미만에서 표시) */}
        <nav className="lg:hidden pb-4 flex flex-wrap gap-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                )}
              >
                <Icon className="w-3 h-3" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
