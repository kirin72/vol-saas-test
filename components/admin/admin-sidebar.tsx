/**
 * 본당 관리자 사이드바 컴포넌트
 * 7개 메뉴 네비게이션 (대시보드, 봉사자, 역할, 템플릿, 미사일정, 일정추가, 배정)
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
  BookOpen,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// 메뉴 아이템 타입 정의
interface MenuItem {
  href: string; // 링크 경로
  label: string; // 메뉴 이름
  icon: React.ComponentType<{ className?: string }>; // lucide-react 아이콘 컴포넌트
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
    label: '봉사 역할 관리',
    icon: Tags,
  },
  {
    href: '/admin/templates',
    label: '미사 템플릿',
    icon: BookOpen,
  },
  {
    href: '/admin/mass-times',
    label: '미사 일정',
    icon: Clock,
  },
  {
    href: '/admin/schedules',
    label: '미사일정 추가',
    icon: CalendarDays,
  },
  {
    href: '/admin/assignments',
    label: '봉사자 배정',
    icon: CalendarCheck,
  },
];

export function AdminSidebar() {
  const pathname = usePathname(); // 현재 경로 가져오기

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen">
      <nav className="p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon; // 아이콘 컴포넌트 추출
          const isActive = pathname === item.href; // 현재 경로와 메뉴 경로 비교

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                // 기본 스타일
                'flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-md transition-colors',
                // 활성 상태: 파란색 배경 + 흰색 텍스트
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              )}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
