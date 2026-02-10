/**
 * 본당 관리자 레이아웃
 * 상단 고정 네비게이션 바 + 메인 컨텐츠
 * ADMIN 권한 확인 및 organizationId 필수 검증
 */
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AdminNavbar } from '@/components/admin/admin-navbar';
import { FeedbackButton } from '@/components/feedback/feedback-button';
import { prisma } from '@/lib/prisma';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 세션 확인
  const session = await auth();

  // 인증되지 않았거나 ADMIN 권한이 아닌 경우 로그인 페이지로 리다이렉트
  if (!session || session.user.role !== 'ADMIN') {
    redirect('/auth/login');
  }

  // organizationId가 없는 경우 (데이터 무결성 오류)
  if (!session.user.organizationId) {
    redirect('/auth/login');
  }

  // 조직 정보 가져오기
  const organization = await prisma.organization.findUnique({
    where: { id: session.user.organizationId },
    select: {
      name: true,
      groupName: true,
      isActive: true,
    },
  });

  // 조직이 존재하지 않거나 비활성화된 경우
  if (!organization || !organization.isActive) {
    redirect('/auth/login');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 상단 고정 네비게이션 바 */}
      <AdminNavbar
        organizationName={organization.name.replace(/본당$/, '성당')}
        groupName={organization.groupName}
        userName={session.user.name || '관리자'}
      />

      {/* 메인 컨텐츠 */}
      <main className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">{children}</div>
      </main>

      {/* 피드백 플로팅 버튼 */}
      <FeedbackButton />
    </div>
  );
}
