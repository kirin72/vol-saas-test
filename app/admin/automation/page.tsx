/**
 * 운영자동화 페이지 (임시)
 * 자동 알림 및 운영 자동화 기능
 */
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Sparkles, Bell, MessageSquare, Calendar, Users } from 'lucide-react';

export default function AutomationPage() {
  return (
    <div className="space-y-6">
      {/* 페이지 제목 */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-7 w-7 text-yellow-500" />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">운영자동화</h1>
          <span className="px-2 py-1 text-xs font-semibold bg-yellow-100 text-yellow-800 rounded-full">
            PRO
          </span>
        </div>
        <p className="text-gray-600 mt-2">
          자동 알림과 운영 자동화로 효율적인 봉사 관리
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
            운영자동화 기능은 현재 개발 중이며, 곧 제공될 예정입니다.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* 예정 기능 소개 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bell className="h-5 w-5 text-blue-600" />
              자동 알림
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-600">
            <p>• 배정 확정 시 봉사자에게 자동 알림</p>
            <p>• 미사 전날 자동 리마인더 발송</p>
            <p>• 요청 승인/거부 시 자동 알림</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageSquare className="h-5 w-5 text-green-600" />
              카카오톡 연동
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-600">
            <p>• 카카오톡 알림톡 발송</p>
            <p>• 개인별 맞춤 메시지</p>
            <p>• 배정표 PDF 자동 전송</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5 text-purple-600" />
              일정 자동화
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-600">
            <p>• 정기 미사 자동 생성</p>
            <p>• 특별 미사 템플릿 관리</p>
            <p>• 반복 일정 자동 처리</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-orange-600" />
              봉사자 관리 자동화
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-600">
            <p>• 장기 미참여자 자동 알림</p>
            <p>• 배정 불균형 자동 감지</p>
            <p>• 봉사 가능 시간 자동 수집</p>
          </CardContent>
        </Card>
      </div>

      {/* 출시 예정 안내 */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-2">
            <p className="text-sm text-gray-600">
              운영자동화 기능은 정식 출시 후 <strong>PRO 구독</strong>에 포함됩니다.
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
