/**
 * 메인 랜딩 페이지
 * 봉사자 관리 시스템
 */
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-6 sm:py-12">
      <main className="max-w-6xl mx-auto text-center space-y-4 sm:space-y-8">
        {/* 헤더 */}
        <div className="space-y-2 sm:space-y-4">
          <h1 className="text-3xl sm:text-5xl font-bold text-gray-900 leading-tight">
            봉사자 관리
            <br />
            <span className="text-blue-600">이제 스마트하게!</span>
          </h1>
          <p className="text-base sm:text-xl text-gray-600 max-w-2xl mx-auto">
            손쉬운 자동화 플랫폼으로
            <br />
            봉사자 배정, 장부, 알림까지
            <br />
	    한 번에 관리하세요!
          </p>
        </div>

        {/* 주요 기능 - 모바일에서 2개씩, 데스크톱에서 4개 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 py-3 sm:py-8">
          <div className="bg-white p-3 sm:p-6 rounded-lg shadow-md">
            <div className="text-2xl sm:text-4xl mb-2 sm:mb-4">📅</div>
            <h3 className="text-sm sm:text-lg font-semibold mb-1 sm:mb-2">봉사 일정 관리</h3>
            <p className="text-gray-600 text-xs sm:text-sm">
              독서단, 제대회 등
              <br />
	            자동화 관리
            </p>
          </div>

          <div className="bg-white p-3 sm:p-6 rounded-lg shadow-md">
            <div className="text-2xl sm:text-4xl mb-2 sm:mb-4">👥</div>
            <h3 className="text-sm sm:text-lg font-semibold mb-1 sm:mb-2">봉사자 배정</h3>
            <p className="text-gray-600 text-xs sm:text-sm">
              수동/자동 배정으로
              <br />
              <b>3초</b>만에 배정 완료!
            </p>
          </div>

          <div className="bg-white p-3 sm:p-6 rounded-lg shadow-md">
            <div className="text-2xl sm:text-4xl mb-2 sm:mb-4">🔔</div>
            <h3 className="text-sm sm:text-lg font-semibold mb-1 sm:mb-2">알림 시스템</h3>
            <p className="text-gray-600 text-xs sm:text-sm">
              봉사자 페이지로
              <br />
              손쉬운 일정 변경
            </p>
          </div>

          <div className="bg-white p-3 sm:p-6 rounded-lg shadow-md">
            <div className="text-2xl sm:text-4xl mb-2 sm:mb-4">💰</div>
            <h3 className="text-sm sm:text-lg font-semibold mb-1 sm:mb-2">회비 출납 장부</h3>
            <p className="text-gray-600 text-xs sm:text-sm">
              자동 정산 장부로
	            <br />
              회계기록 간편 관리
            </p>
          </div>
        </div>

        {/* CTA 버튼 - 로그인 먼저, 무료 시작 아래 */}
        <div className="flex flex-col gap-2 sm:gap-3 items-center pt-2 sm:pt-4">
          <Link href="/auth/login" className="w-full max-w-xs">
            <Button size="lg" variant="outline" className="w-full px-8">
              로그인
            </Button>
          </Link>
          <Link href="/auth/register" className="w-full max-w-xs">
            <Button size="lg" className="w-full px-8">
              무료로 시작하기
            </Button>
          </Link>
        </div>

        {/* Super Admin 링크 */}
        <div className="pt-4 sm:pt-8 text-sm text-gray-500">
          <Link href="/auth/super-admin" className="hover:text-gray-700 underline">
            총괄 관리자 로그인
          </Link>
        </div>

        {/* 푸터 */}
        <footer className="pt-4 sm:pt-12 text-sm text-gray-500">
          © 2026 MechInno, Inc. All rights reserved.
        </footer>
      </main>
    </div>
  );
}
