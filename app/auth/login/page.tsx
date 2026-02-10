/**
 * 본당 관리자/봉사자 로그인 페이지
 * 이메일 또는 이름으로 로그인 가능
 * 동일한 이름이 여러 성당에 있으면 성당 선택 UI 제공
 */
'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

// 성당 정보 타입
interface OrganizationUser {
  id: string;
  name: string;
  email: string;
  organizationId: string;
  organizationName: string;
  role: string;
}

export default function LoginPage() {
  const router = useRouter();

  // 1단계: 이메일/이름 + 비밀번호 입력
  const [identifier, setIdentifier] = useState(''); // 이메일 또는 이름
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // 2단계: 성당 선택
  const [showOrganizationSelection, setShowOrganizationSelection] = useState(false);
  const [users, setUsers] = useState<OrganizationUser[]>([]);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState('');

  // 로그인 후 비밀번호 변경 유도
  const [showPasswordChangePrompt, setShowPasswordChangePrompt] = useState(false);

  // 1단계: 사용자 확인
  const handleCheckUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 사용자 확인 API 호출
      const response = await fetch('/api/auth/check-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || '로그인에 실패했습니다.');
        setLoading(false);
        return;
      }

      // 단일 사용자 → 바로 로그인
      if (!data.needsOrganizationSelection) {
        await performLogin(data.user.email, data.user.organizationId);
      } else {
        // 여러 사용자 → 성당 선택 UI 표시
        setUsers(data.users);
        setShowOrganizationSelection(true);
        setLoading(false);
      }
    } catch (err) {
      console.error('사용자 확인 오류:', err);
      setError('로그인 중 오류가 발생했습니다.');
      setLoading(false);
    }
  };

  // 2단계: 성당 선택 후 로그인
  const handleOrganizationLogin = async () => {
    if (!selectedOrganizationId) {
      setError('성당을 선택해주세요.');
      return;
    }

    const selectedUser = users.find(u => u.organizationId === selectedOrganizationId);
    if (!selectedUser) {
      setError('선택한 성당 정보를 찾을 수 없습니다.');
      return;
    }

    setLoading(true);
    await performLogin(identifier, selectedOrganizationId);
  };

  // 실제 로그인 수행
  const performLogin = async (emailOrName: string, orgId?: string) => {
    try {
      // NextAuth credentials provider 사용
      const result = await signIn('credentials', {
        email: emailOrName,
        password,
        organizationId: orgId,
        // role은 전달하지 않음 (DB에서 자동으로 조회)
        redirect: false,
      });

      console.log('로그인 결과:', result);

      if (result?.error) {
        setError(result.error);
        setLoading(false);
      } else if (result?.ok) {
        // 로그인 성공 → 세션을 기다린 후 role에 따라 리다이렉트
        // NextAuth v5에서는 쿠키가 설정되는데 시간이 필요할 수 있음
        await new Promise(resolve => setTimeout(resolve, 500));

        // 세션 확인
        const sessionRes = await fetch('/api/auth/session');
        const session = await sessionRes.json();

        console.log('세션 정보:', session);

        if (!session?.user) {
          // 세션이 없으면 강제 리디렉션
          setLoading(false);
          window.location.href = '/admin/dashboard';
          return;
        }

        const userRole = session.user.role;
        const isFirstLogin = session.user.isFirstLogin;

        // 봉사자의 첫 로그인인 경우에만 비밀번호 변경 유도 알림 표시
        if (userRole === 'VOLUNTEER' && isFirstLogin) {
          setShowPasswordChangePrompt(true);
          setLoading(false);
          // 자동 리다이렉트 없이 사용자가 직접 선택하도록 대기
        } else {
          // 관리자 또는 이미 로그인한 봉사자는 바로 대시보드로 이동
          let dashboardUrl = '/admin/dashboard';

          if (userRole === 'ADMIN') {
            dashboardUrl = '/admin/dashboard';
          } else if (userRole === 'VOLUNTEER') {
            dashboardUrl = '/volunteer/dashboard';
          } else if (userRole === 'SUPER_ADMIN') {
            dashboardUrl = '/super-admin/dashboard';
          }

          // 강제 리디렉션 (router.push 대신 window.location 사용)
          window.location.href = dashboardUrl;
        }
      }
    } catch (err) {
      console.error('로그인 오류:', err);
      setError('로그인 중 오류가 발생했습니다.');
      setLoading(false);
    }
  };

  // 비밀번호 변경 페이지로 이동 (로그인 페이지에서 다른 레이아웃으로 이동하므로 window.location 사용)
  const handlePasswordChange = () => {
    window.location.href = '/volunteer/settings';
  };

  // 성공 알림 무시하고 대시보드로 이동
  const handleSkipPasswordChange = async () => {
    // isFirstLogin을 false로 업데이트
    await fetch('/api/auth/update-first-login', {
      method: 'POST',
    });

    await new Promise(resolve => setTimeout(resolve, 300));

    const sessionRes = await fetch('/api/auth/session');
    const session = await sessionRes.json();

    let dashboardUrl = '/volunteer/dashboard';

    if (session?.user?.role === 'ADMIN') {
      dashboardUrl = '/admin/dashboard';
    } else if (session?.user?.role === 'VOLUNTEER') {
      dashboardUrl = '/volunteer/dashboard';
    }

    // 강제 리디렉션
    window.location.href = dashboardUrl;
  };

  // 비밀번호 변경 유도 알림
  if (showPasswordChangePrompt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">
              로그인 성공!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription className="text-center text-lg">
                비밀번호를 변경하시겠습니까?
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Button
                onClick={handlePasswordChange}
                className="w-full"
              >
                비밀번호 변경하기
              </Button>
              <Button
                onClick={handleSkipPasswordChange}
                variant="outline"
                className="w-full"
              >
                나중에 하기
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 성당 선택 UI
  if (showOrganizationSelection) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">
              성당 선택
            </CardTitle>
            <CardDescription className="text-center">
              {identifier} 님의 소속 성당을 선택해주세요
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup
              value={selectedOrganizationId}
              onValueChange={setSelectedOrganizationId}
            >
              {users.map((user) => (
                <div key={user.organizationId} className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-gray-50">
                  <RadioGroupItem value={user.organizationId} id={user.organizationId} />
                  <Label
                    htmlFor={user.organizationId}
                    className="flex-1 cursor-pointer"
                  >
                    <div className="font-medium">{user.organizationName}</div>
                    <div className="text-sm text-gray-500">
                      {user.role === 'ADMIN' ? '관리자' : '봉사자'}
                    </div>
                  </Label>
                </div>
              ))}
            </RadioGroup>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Button
                onClick={handleOrganizationLogin}
                className="w-full"
                disabled={loading || !selectedOrganizationId}
              >
                {loading ? '로그인 중...' : '로그인'}
              </Button>
              <Button
                onClick={() => {
                  setShowOrganizationSelection(false);
                  setUsers([]);
                  setSelectedOrganizationId('');
                  setPassword('');
                }}
                variant="outline"
                className="w-full"
              >
                다시 입력하기
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 기본 로그인 UI
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            로그인
          </CardTitle>
          <CardDescription className="text-center">
            이메일 또는 이름으로 로그인하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCheckUser} className="space-y-4">
            {/* 이메일/이름 입력 */}
            <div className="space-y-2">
              <Label htmlFor="identifier">이메일 또는 이름</Label>
              <Input
                id="identifier"
                type="text"
                placeholder="이메일 또는 이름을 입력하세요"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                disabled={loading}
              />
              <p className="text-xs text-gray-500">
                예: example@email.com 또는 홍길동
              </p>
            </div>

            {/* 비밀번호 입력 */}
            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                type="password"
                placeholder="비밀번호를 입력하세요"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            {/* 에러 메시지 */}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>❌ {error}</AlertDescription>
              </Alert>
            )}

            {/* 로그인 버튼 */}
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? '확인 중...' : '로그인'}
            </Button>

            {/* 회원가입 링크 */}
            <div className="text-center text-sm text-gray-600">
              아직 계정이 없으신가요?{' '}
              <Link href="/auth/register" className="text-blue-600 hover:underline">
                회원가입
              </Link>
            </div>

            {/* Super Admin 로그인 링크 */}
            <div className="text-center text-sm text-gray-500 pt-4 border-t">
              <Link href="/auth/super-admin" className="hover:underline">
                총괄 관리자 로그인
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
