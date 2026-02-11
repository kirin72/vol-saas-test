/**
 * 초기 설정 가이드 페이지
 * 처음 가입한 관리자에게 설정 순서를 안내하는 페이지
 * 대시보드 웰컴 배너 또는 메뉴 "초기 설정 방법"에서 접근
 */
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Tags,
  Users,
  Copy,
  ArrowLeft,
  BookOpen,
  Sparkles,
  ChevronRight,
  Info,
} from 'lucide-react';

export default function SetupGuidePage() {
  // 뒤로가기 라우터
  const router = useRouter();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* 환영 헤더 */}
      <div className="text-center space-y-3">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          초기 설정 안내
        </h1>
        <p className="text-gray-600 text-sm sm:text-base">
          아래 순서대로 설정하시면 봉사 관리를 시작할 수 있습니다.
        </p>
      </div>

      {/* 3단계 설정 안내 */}
      <div className="space-y-4">
        {/* 1단계: 역할 관리 */}
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-start gap-4">
              {/* 단계 번호 아이콘 */}
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-lg">
                1
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Tags className="w-5 h-5 text-blue-600" />
                  <h2 className="text-lg font-bold text-gray-900">역할 관리</h2>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">
                  가장 먼저, 단체의 봉사 역할을 등록해 주세요.
                  <br />
                  각 봉사 역할당 1명의 봉사자를 배정할 수 있습니다.
                  <br />
                  예) 해설, 1독서, 2독서, 1복사, 2복사 등
                </p>
                {/* 해당 페이지 링크 */}
                <Link
                  href="/admin/roles"
                  className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
                >
                  역할 관리 페이지로 이동
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2단계: 봉사자 관리 */}
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-600 text-white flex items-center justify-center font-bold text-lg">
                2
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-green-600" />
                  <h2 className="text-lg font-bold text-gray-900">봉사자 관리</h2>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">
                  이 메뉴에서 단체의 봉사자를 등록할 수 있습니다.
                  <br />
                  등록된 봉사자는 본인의 이름과 전화번호 뒷자리로 로그인 할 수 있습니다.
                </p>
                <Link
                  href="/admin/volunteers"
                  className="inline-flex items-center gap-1 text-sm font-medium text-green-600 hover:text-green-800 transition-colors"
                >
                  봉사자 관리 페이지로 이동
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3단계: 미사 템플릿 */}
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-lg">
                3
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Copy className="w-5 h-5 text-purple-600" />
                  <h2 className="text-lg font-bold text-gray-900">미사 일정</h2>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">
                  본당의 미사 일정을 만들어 주세요.
                  <br />
                  미사일정은 자동으로 생성 될 수도 있으나 확인이 필요합니다.
                  <br />
                  각 미사에 필요한 봉사 역할도 선택할 수 있습니다.
                </p>
                <Link
                  href="/admin/mass-times"
                  className="inline-flex items-center gap-1 text-sm font-medium text-purple-600 hover:text-purple-800 transition-colors"
                >
                  미사 일정 페이지로 이동
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 추가 안내 */}
      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-amber-800">참고 사항</h3>
              <p className="text-sm text-amber-700 leading-relaxed">
                위 3단계를 완료하면,<strong>봉사자 배정</strong>에서 각 미사에 봉사자를 배정할 수 있습니다.
              </p>
              <p className="text-sm text-amber-700 leading-relaxed">
                명절이나 대축일 등 <strong>특별 미사</strong>가 있는 경우, 왼쪽 메뉴의 미사 일정 추가로 만들어서 관리할 수 있습니다.
              </p>
              <p className="text-sm text-amber-700 leading-relaxed">
                PC사용에 능숙한 경우 컴퓨터로도 bongsaja.com 에 접속하여 넓은화면으로 편리하게 사용 할 수 있습니다.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 하단 버튼 영역 */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
        {/* 자세한 사용법보기 (비활성) */}
        <Button
          disabled
          variant="outline"
          className="min-h-[44px] gap-2"
        >
          <BookOpen className="w-4 h-4" />
          자세한 사용법보기
          <span className="text-xs text-gray-400">(준비 중)</span>
        </Button>

        {/* 뒤로가기 */}
        <Button
          onClick={() => router.back()}
          variant="default"
          className="min-h-[44px] gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          뒤로가기
        </Button>
      </div>
    </div>
  );
}
