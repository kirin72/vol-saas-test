/**
 * 본당 관리자 헤더 컴포넌트
 * 조직명, 관리자명, 로그아웃 버튼 표시
 */
import { signOut } from '@/lib/auth';
import { Button } from '@/components/ui/button';

interface AdminHeaderProps {
  organizationName: string; // 본당 이름
  groupName: string | null; // 단체 이름
  userName: string; // 관리자 이름
}

export function AdminHeader({ organizationName, groupName, userName }: AdminHeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* 왼쪽: 성당 이름 + 단체명 */}
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900">
              {organizationName}성당
            </h1>
            <span className="text-sm text-gray-500 font-normal">
              {groupName ? `${groupName} 관리자` : '관리자'}
            </span>
          </div>

          {/* 오른쪽: 사용자 정보 + 로그아웃 */}
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{userName}</span>
            <form
              action={async () => {
                'use server';
                await signOut({ redirectTo: '/auth/login' });
              }}
            >
              <Button type="submit" variant="outline" size="sm">
                로그아웃
              </Button>
            </form>
          </div>
        </div>
      </div>
    </header>
  );
}
