/**
 * 봉사자 설정 페이지
 * 비밀번호 변경 기능 제공
 */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function VolunteerSettingsPage() {
  const router = useRouter();

  // 비밀번호 변경 상태
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // 비밀번호 변경 처리
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // 유효성 검사
    if (newPassword !== confirmPassword) {
      setError('새 비밀번호가 일치하지 않습니다.');
      return;
    }

    if (newPassword.length < 6) {
      setError('비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }

    setLoading(true);

    try {
      // 비밀번호 변경 API 호출
      const response = await fetch('/api/volunteer/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || '비밀번호 변경에 실패했습니다.');
        setLoading(false);
        return;
      }

      // 성공
      setSuccess('비밀번호가 성공적으로 변경되었습니다.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      // 2초 후 대시보드로 이동
      setTimeout(() => {
        router.push('/volunteer/dashboard');
        router.refresh();
      }, 2000);
    } catch (err) {
      console.error('비밀번호 변경 오류:', err);
      setError('비밀번호 변경 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            비밀번호 변경
          </CardTitle>
          <CardDescription className="text-center">
            새로운 비밀번호를 설정하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            {/* 현재 비밀번호 */}
            <div className="space-y-2">
              <Label htmlFor="currentPassword">현재 비밀번호</Label>
              <Input
                id="currentPassword"
                type="password"
                placeholder="현재 비밀번호를 입력하세요"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            {/* 새 비밀번호 */}
            <div className="space-y-2">
              <Label htmlFor="newPassword">새 비밀번호</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="새 비밀번호를 입력하세요 (최소 6자)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            {/* 비밀번호 확인 */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">비밀번호 확인</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="새 비밀번호를 다시 입력하세요"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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

            {/* 성공 메시지 */}
            {success && (
              <Alert className="bg-green-50 border-green-200">
                <AlertDescription className="text-green-800">
                  ✅ {success}
                </AlertDescription>
              </Alert>
            )}

            {/* 버튼 */}
            <div className="space-y-2">
              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? '변경 중...' : '비밀번호 변경'}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => router.push('/volunteer/dashboard')}
                disabled={loading}
              >
                취소
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
