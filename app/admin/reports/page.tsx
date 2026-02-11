/**
 * 통계리포트 페이지 (임시)
 * 봉사 활동 통계 및 분석 리포트
 */
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart3, Sparkles, TrendingUp, Users, Calendar, PieChart } from 'lucide-react';

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      {/* 페이지 제목 */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <BarChart3 className="h-7 w-7 text-yellow-500" />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">통계리포트</h1>
          <span className="px-2 py-1 text-xs font-semibold bg-yellow-100 text-yellow-800 rounded-full">
            PRO
          </span>
        </div>
        <p className="text-gray-600 mt-2">
          봉사 활동 통계 및 인사이트를 한눈에 확인
        </p>
      </div>

      {/* 준비중 안내 */}
      <Card className="border-2 border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-600" />
            준비 중입니다
          </CardTitle>
          <CardDescription>
            통계리포트 기능은 현재 개발 중이며, 곧 제공될 예정입니다.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* 예정 기능 소개 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              참여율 분석
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-600">
            <p>• 월별/연도별 참여율 추이</p>
            <p>• 봉사자별 참여 통계</p>
            <p>• 역할별 참여도 분석</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-green-600" />
              봉사자 통계
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-600">
            <p>• 봉사자 성장 추이</p>
            <p>• 활동 봉사자 vs 비활동 봉사자</p>
            <p>• 연령대별/성별 분포</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5 text-purple-600" />
              일정 통계
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-600">
            <p>• 미사 종류별 통계</p>
            <p>• 요일별 배정 현황</p>
            <p>• 시간대별 참여 분석</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <PieChart className="h-5 w-5 text-orange-600" />
              맞춤 리포트
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-600">
            <p>• 월간 활동 리포트 자동 생성</p>
            <p>• 연간 종합 리포트</p>
            <p>• PDF/Excel 내보내기</p>
          </CardContent>
        </Card>
      </div>

      {/* 예시 차트 영역 (준비중) */}
      <Card>
        <CardHeader>
          <CardTitle>통계 차트 미리보기</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
            <div className="text-center space-y-2">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto" />
              <p className="text-sm text-gray-500">통계 차트가 이곳에 표시됩니다</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 출시 예정 안내 */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-2">
            <p className="text-sm text-gray-600">
              통계리포트 기능은 정식 출시 후 <strong>PRO 구독</strong>에 포함됩니다.
            </p>
            <p className="text-xs text-gray-500">
              출시 일정 및 자세한 내용은 추후 공지 예정입니다.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
