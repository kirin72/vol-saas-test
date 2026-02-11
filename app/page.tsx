/**
 * 메인 랜딩 페이지
 * 봉사자 관리 시스템 - 모바일 최적화 버전
 */
import Link from 'next/link';
import Image from 'next/image';
import { Sparkles, RefreshCcw, Bell, Wallet } from 'lucide-react';

export default function Home() {
  return (
    <div className="bg-slate-50 text-gray-800 min-h-screen pb-32">
      {/* HERO */}
      <section className="text-center px-5 pt-10 pb-6">
        <h1 className="text-3xl font-bold leading-tight">
          성당 봉사자 관리<br />
          <span className="text-blue-600">간편하고 체계적으로</span>
        </h1>

        <p className="mt-4 text-gray-600 text-base leading-relaxed">
          복잡한 봉사배정과 회계를<br />
          한 번에 정리해 드립니다.
        </p>
      </section>

      {/* FEATURES */}
      <section className="px-4">
        <div className="grid grid-cols-2 gap-4">
          {/* 쉬운 봉사자 배정 */}
          <div className="bg-white rounded-2xl shadow-md p-4 text-center">
            <div className="w-12 h-12 mx-auto mb-3 flex items-center justify-center rounded-xl bg-purple-100 text-purple-600">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="font-semibold">쉬운 봉사자 배정</h3>
            <p className="text-sm text-gray-500 mt-1">몇 번의 클릭으로 자동 배정</p>
          </div>

          {/* 일정 변경도 간편하게 */}
          <div className="bg-white rounded-2xl shadow-md p-4 text-center">
            <div className="w-12 h-12 mx-auto mb-3 flex items-center justify-center rounded-xl bg-green-100 text-green-600">
              <RefreshCcw className="w-6 h-6" />
            </div>
            <h3 className="font-semibold">일정 변경도 간편하게</h3>
            <p className="text-sm text-gray-500 mt-1">봉사자가 직접 요청 가능</p>
          </div>

          {/* 자동 알림 시스템 */}
          <div className="bg-white rounded-2xl shadow-md p-4 text-center">
            <div className="w-12 h-12 mx-auto mb-3 flex items-center justify-center rounded-xl bg-orange-100 text-orange-600">
              <Bell className="w-6 h-6" />
            </div>
            <h3 className="font-semibold">자동 알림 시스템</h3>
            <p className="text-sm text-gray-500 mt-1">배정 하루 전 카톡 안내</p>
          </div>

          {/* 회계까지 한 번에 */}
          <div className="bg-white rounded-2xl shadow-md p-4 text-center">
            <div className="w-12 h-12 mx-auto mb-3 flex items-center justify-center rounded-xl bg-blue-100 text-blue-600">
              <Wallet className="w-6 h-6" />
            </div>
            <h3 className="font-semibold">회계까지 한 번에</h3>
            <p className="text-sm text-gray-500 mt-1">입출금 자동 정리</p>
          </div>
        </div>
      </section>

      {/* SCREENSHOT */}
      <section className="px-5 mt-10 text-center">
        <div className="mt-10 px-5">
          <Image
            src="/auto-assign.png"
            alt="자동배정 화면"
            width={800}
            height={600}
            className="rounded-2xl border border-gray-200 shadow-lg mx-auto"
            priority
          />
        </div>
        <p className="mt-4 text-gray-600 text-sm">
          공정한 자동 배정으로 복잡한 봉사 배정 시간을 크게 줄일 수 있습니다.
        </p>
      </section>

      {/* CTA - 하단 고정 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-lg">
        <p className="text-xs text-gray-500 text-center mb-2">
          성당 관리자 · 단체장용 봉사 관리 서비스
        </p>
        <div className="flex gap-3">
          <Link href="/auth/login" className="flex-1">
            <button className="w-full border rounded-xl py-3 font-medium hover:bg-gray-50 transition-colors">
              로그인
            </button>
          </Link>
          <Link href="/auth/register" className="flex-1">
            <button className="w-full rounded-xl py-3 font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all">
              무료로 시작하기
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
