/**
 * Super Admin 레이아웃
 * 공통 사이드바 및 헤더
 */
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { handleLogout } from './actions';

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // 인증 확인
  if (!session || session.user.role !== 'SUPER_ADMIN') {
    redirect('/auth/super-admin');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">
                총괄 관리자 대시보드
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                {session.user.name}
              </span>
              <form action={handleLogout}>
                <Button type="submit" variant="outline" size="sm">
                  로그아웃
                </Button>
              </form>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* 사이드바 */}
        <aside className="w-64 bg-white border-r border-gray-200 min-h-screen">
          <nav className="p-4 space-y-2">
            <Link
              href="/super-admin/dashboard"
              className="block px-4 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100"
            >
              📊 대시보드
            </Link>
            <Link
              href="/super-admin/organizations"
              className="block px-4 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100"
            >
              🏛️ 조직 관리
            </Link>
            <Link
              href="/super-admin/subscriptions"
              className="block px-4 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100"
            >
              💳 구독 관리
            </Link>
            <Link
              href="/super-admin/feedback"
              className="block px-4 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100"
            >
              📋 피드백 관리
            </Link>
          </nav>
        </aside>

        {/* 메인 컨텐츠 */}
        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
