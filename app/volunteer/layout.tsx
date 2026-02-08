/**
 * 봉사자 레이아웃
 * 봉사자 전용 페이지의 기본 레이아웃
 * VOLUNTEER 권한 확인 및 organizationId 필수 검증
 */
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { VolunteerHeader } from '@/components/volunteer/volunteer-header';
import { prisma } from '@/lib/prisma';

export default async function VolunteerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 세션 확인
  const session = await auth();

  // 인증되지 않았거나 VOLUNTEER 권한이 아닌 경우 로그인 페이지로 리다이렉트
  if (!session || session.user.role !== 'VOLUNTEER') {
    redirect('/auth/login');
  }

  // organizationId가 없는 경우 (데이터 무결성 오류)
  if (!session.user.organizationId) {
    redirect('/auth/login');
  }

  // 봉사자 정보 가져오기
  const volunteer = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      baptismalName: true,
      organization: {
        select: {
          name: true,
        },
      },
      userRoles: {
        include: {
          volunteerRole: true,
        },
      },
    },
  });

  if (!volunteer) {
    redirect('/auth/login');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 상단 헤더 */}
      <VolunteerHeader
        organizationName={volunteer.organization?.name || ''}
        volunteerName={volunteer.name}
        baptismalName={volunteer.baptismalName}
        roles={volunteer.userRoles.map((ur) => ur.volunteerRole)}
      />

      {/* 메인 컨텐츠 */}
      <main className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
