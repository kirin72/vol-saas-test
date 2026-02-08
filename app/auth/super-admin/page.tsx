/**
 * Super Admin 로그인 페이지
 * IP 주소 화이트리스트 검증 + 환경변수 기반 인증
 */
'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // 클라이언트 IP 주소 표시 (참고용)
  const [clientIP, setClientIP] = useState<string>('');

  // 컴포넌트 마운트 시 IP 주소 가져오기
  useState(() => {
    fetch('/api/client-ip')
      .then((res) => res.json())
      .then((data) => setClientIP(data.ip))
      .catch(() => setClientIP('알 수 없음'));
  });

  // 로그인 처리
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        role: 'SUPER_ADMIN',
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
      } else {
        router.push('/super-admin/dashboard');
      }
    } catch (err) {
      setError('로그인 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            총괄 관리자 로그인
          </CardTitle>
          <CardDescription className="text-center">
            Super Admin 전용 로그인 페이지
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* IP 주소 표시 */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm">
              <p className="text-gray-700">
                현재 IP 주소: <span className="font-mono font-medium">{clientIP || '확인 중...'}</span>
              </p>
              <p className="text-gray-600 text-xs mt-1">
                화이트리스트에 등록된 IP만 접근 가능합니다.
              </p>
            </div>

            {/* 이메일 입력 */}
            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            {/* 비밀번호 입력 */}
            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            {/* 에러 메시지 */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* 로그인 버튼 */}
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? '로그인 중...' : '로그인'}
            </Button>

            {/* 일반 사용자 로그인 링크 */}
            <div className="text-center text-sm text-gray-600">
              <a href="/auth/login" className="text-blue-600 hover:underline">
                본당 관리자/봉사자 로그인
              </a>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
