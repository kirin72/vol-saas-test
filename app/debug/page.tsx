/**
 * 디버그 페이지
 * 로그인 문제를 진단하기 위한 정보를 표시합니다
 */
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface DebugInfo {
  session?: any;
  env?: any;
  error?: string;
}

export default function DebugPage() {
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({});
  const [loading, setLoading] = useState(false);

  const fetchDebugInfo = async () => {
    setLoading(true);
    try {
      // 세션 정보 가져오기
      const sessionRes = await fetch('/api/debug/session');
      const sessionData = await sessionRes.json();

      // 환경변수 정보 가져오기
      const envRes = await fetch('/api/debug/env');
      const envData = await envRes.json();

      setDebugInfo({
        session: sessionData,
        env: envData,
      });
    } catch (error) {
      console.error('디버그 정보 가져오기 실패:', error);
      setDebugInfo({
        error: error instanceof Error ? error.message : '알 수 없는 오류',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDebugInfo();
  }, []);

  const getStatusIcon = (value: any) => {
    if (value === true || (typeof value === 'string' && !value.includes('❌'))) {
      return '✅';
    }
    return '❌';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">로그인 디버깅 페이지</h1>
            <p className="text-gray-600 mt-2">로그인 문제를 진단하기 위한 정보를 확인하세요</p>
          </div>
          <Button onClick={fetchDebugInfo} disabled={loading}>
            {loading ? '새로고침 중...' : '새로고침'}
          </Button>
        </div>

        {debugInfo.error && (
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-700">❌ 오류 발생</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-600">{debugInfo.error}</p>
            </CardContent>
          </Card>
        )}

        {/* 세션 정보 */}
        <Card>
          <CardHeader>
            <CardTitle>
              {getStatusIcon(debugInfo.session?.hasSession)} 세션 정보
            </CardTitle>
            <CardDescription>
              현재 로그인 세션 상태를 확인합니다
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p>로딩 중...</p>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="font-semibold">세션 존재:</p>
                    <p className={debugInfo.session?.hasSession ? 'text-green-600' : 'text-red-600'}>
                      {debugInfo.session?.hasSession ? '✅ 있음' : '❌ 없음'}
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold">타임스탬프:</p>
                    <p className="text-sm text-gray-600">{debugInfo.session?.timestamp}</p>
                  </div>
                </div>

                {debugInfo.session?.user && (
                  <div>
                    <p className="font-semibold mb-2">사용자 정보:</p>
                    <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm">
                      {JSON.stringify(debugInfo.session.user, null, 2)}
                    </pre>
                  </div>
                )}

                <div>
                  <p className="font-semibold mb-2">쿠키:</p>
                  <div className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm max-h-48">
                    {debugInfo.session?.cookies?.length > 0 ? (
                      <ul className="space-y-2">
                        {debugInfo.session.cookies.map((cookie: any, index: number) => (
                          <li key={index} className="border-b pb-2">
                            <span className="font-mono">{cookie.name}</span>
                            {cookie.name.includes('next-auth') && (
                              <span className="ml-2 text-green-600">✅ NextAuth 쿠키</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-red-600">❌ 쿠키 없음</p>
                    )}
                  </div>
                </div>

                <div>
                  <p className="font-semibold mb-2">요청 헤더:</p>
                  <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm">
                    {JSON.stringify(debugInfo.session?.headers, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 환경변수 정보 */}
        <Card>
          <CardHeader>
            <CardTitle>⚙️ 환경변수 설정</CardTitle>
            <CardDescription>
              NextAuth 및 Super Admin 설정을 확인합니다 (민감 정보는 마스킹됨)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p>로딩 중...</p>
            ) : (
              <div className="space-y-6">
                {/* NextAuth 설정 */}
                <div>
                  <h3 className="font-semibold text-lg mb-3">NextAuth 설정</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <span className="font-medium">NEXTAUTH_URL:</span>
                      <span className={
                        debugInfo.env?.nextAuth?.url?.includes('❌')
                          ? 'text-red-600'
                          : 'text-green-600'
                      }>
                        {debugInfo.env?.nextAuth?.url}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <span className="font-medium">NEXTAUTH_SECRET:</span>
                      <span className={
                        debugInfo.env?.nextAuth?.secret?.includes('❌')
                          ? 'text-red-600'
                          : 'text-green-600'
                      }>
                        {debugInfo.env?.nextAuth?.secret}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Super Admin 설정 */}
                <div>
                  <h3 className="font-semibold text-lg mb-3">Super Admin 설정</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <span className="font-medium">SUPER_ADMIN_EMAIL:</span>
                      <span className={
                        debugInfo.env?.superAdmin?.email?.includes('❌')
                          ? 'text-red-600'
                          : 'text-green-600'
                      }>
                        {debugInfo.env?.superAdmin?.email}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <span className="font-medium">SUPER_ADMIN_PASSWORD:</span>
                      <span className={
                        debugInfo.env?.superAdmin?.password?.includes('❌')
                          ? 'text-red-600'
                          : 'text-green-600'
                      }>
                        {debugInfo.env?.superAdmin?.password}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 데이터베이스 설정 */}
                <div>
                  <h3 className="font-semibold text-lg mb-3">데이터베이스 설정</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <span className="font-medium">DATABASE_URL:</span>
                      <span className={
                        debugInfo.env?.database?.url?.includes('❌')
                          ? 'text-red-600'
                          : 'text-green-600'
                      }>
                        {debugInfo.env?.database?.url}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 환경 */}
                <div>
                  <h3 className="font-semibold text-lg mb-3">기타 정보</h3>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <span className="font-medium">NODE_ENV:</span>
                    <span className="font-mono">{debugInfo.env?.nodeEnv}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 진단 가이드 */}
        <Card>
          <CardHeader>
            <CardTitle>🔍 문제 진단 가이드</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">1. 세션이 없는 경우 (hasSession: false)</h4>
                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                  <li>로그인이 실패했거나 세션이 생성되지 않음</li>
                  <li>쿠키가 제대로 설정되지 않았을 수 있음</li>
                  <li>NEXTAUTH_URL이 잘못 설정되었을 수 있음</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">2. 쿠키가 없는 경우</h4>
                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                  <li>NextAuth가 제대로 작동하지 않음</li>
                  <li>쿠키 설정에 문제가 있을 수 있음</li>
                  <li>브라우저 쿠키가 차단되었을 수 있음</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">3. 환경변수가 ❌인 경우</h4>
                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                  <li>Vercel 환경변수가 설정되지 않음</li>
                  <li>환경변수 설정 후 재배포 필요</li>
                  <li>변수명 오타 확인 필요</li>
                </ul>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                <h4 className="font-semibold text-yellow-800 mb-2">⚠️ 다음 단계</h4>
                <p className="text-sm text-yellow-700">
                  위 정보를 확인한 후, 문제가 있는 부분의 스크린샷을 공유해주시면
                  더 정확한 해결 방법을 안내해드리겠습니다.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
