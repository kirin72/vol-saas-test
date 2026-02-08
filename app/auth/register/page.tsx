/**
 * 조직 회원가입 페이지
 * 조직(Organization) + 관리자 계정(User) 동시 생성
 */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 조직 정보
  const [orgName, setOrgName] = useState('');
  const [orgGroupName, setOrgGroupName] = useState(''); // 조직이름 (예: 독서단)
  const [orgSlug, setOrgSlug] = useState('');
  const [orgPhone, setOrgPhone] = useState('');
  const [orgEmail, setOrgEmail] = useState('');
  const [orgAddress, setOrgAddress] = useState('');

  // 관리자 정보
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminPasswordConfirm, setAdminPasswordConfirm] = useState('');

  // 조직명에서 자동으로 slug 생성
  const handleOrgNameChange = (value: string) => {
    setOrgName(value);
    // 한글 → 영문 변환은 추후 구현, 일단 소문자 + 하이픈으로 변환
    const slug = value
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    setOrgSlug(slug);
  };

  // 회원가입 처리
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 유효성 검사
    if (adminPassword !== adminPasswordConfirm) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    if (adminPassword.length < 8) {
      setError('비밀번호는 최소 8자 이상이어야 합니다.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/organizations/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization: {
            name: orgName,
            groupName: orgGroupName,
            slug: orgSlug,
            phone: orgPhone,
            email: orgEmail,
            address: orgAddress,
          },
          admin: {
            name: adminName,
            email: adminEmail,
            phone: adminPhone,
            password: adminPassword,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '회원가입에 실패했습니다.');
      }

      // 회원가입 성공 → 로그인 페이지로 이동
      alert('회원가입이 완료되었습니다! 로그인해주세요.');
      router.push('/auth/login');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            본당 조직 회원가입
          </CardTitle>
          <CardDescription className="text-center">
            본당 및 조직 정보와 관리자 계정을 등록하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 조직 정보 섹션 */}
            <div>
              <h3 className="text-lg font-semibold mb-4">조직 정보</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="orgName">본당 이름 *</Label>
                  <Input
                    id="orgName"
                    type="text"
                    placeholder="명동성당"
                    value={orgName}
                    onChange={(e) => handleOrgNameChange(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="orgGroupName">조직이름</Label>
                  <Input
                    id="orgGroupName"
                    type="text"
                    placeholder="예)독서단"
                    value={orgGroupName}
                    onChange={(e) => setOrgGroupName(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="orgSlug">URL 식별자 *</Label>
                  <Input
                    id="orgSlug"
                    type="text"
                    placeholder="myeongdong"
                    value={orgSlug}
                    onChange={(e) => setOrgSlug(e.target.value)}
                    required
                    disabled={loading}
                  />
                  <p className="text-xs text-gray-500">
                    영문 소문자, 숫자, 하이픈만 사용 가능
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="orgPhone">전화번호</Label>
                    <Input
                      id="orgPhone"
                      type="tel"
                      placeholder="02-1234-5678"
                      value={orgPhone}
                      onChange={(e) => setOrgPhone(e.target.value)}
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="orgEmail">이메일</Label>
                    <Input
                      id="orgEmail"
                      type="email"
                      placeholder="info@church.or.kr"
                      value={orgEmail}
                      onChange={(e) => setOrgEmail(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="orgAddress">주소</Label>
                  <Input
                    id="orgAddress"
                    type="text"
                    placeholder="서울특별시 중구 명동길 74"
                    value={orgAddress}
                    onChange={(e) => setOrgAddress(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* 관리자 정보 섹션 */}
            <div>
              <h3 className="text-lg font-semibold mb-4">조직 관리자 정보</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="adminName">이름 *</Label>
                    <Input
                      id="adminName"
                      type="text"
                      placeholder="김관리자"
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="adminPhone">전화번호</Label>
                    <Input
                      id="adminPhone"
                      type="tel"
                      placeholder="010-1234-5678"
                      value={adminPhone}
                      onChange={(e) => setAdminPhone(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adminEmail">이메일 *</Label>
                  <Input
                    id="adminEmail"
                    type="email"
                    placeholder="admin@church.or.kr"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="adminPassword">비밀번호 *</Label>
                    <Input
                      id="adminPassword"
                      type="password"
                      placeholder="••••••••"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="adminPasswordConfirm">비밀번호 확인 *</Label>
                    <Input
                      id="adminPasswordConfirm"
                      type="password"
                      placeholder="••••••••"
                      value={adminPasswordConfirm}
                      onChange={(e) => setAdminPasswordConfirm(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  비밀번호는 최소 8자 이상이어야 합니다.
                </p>
              </div>
            </div>

            {/* 에러 메시지 */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* 가입 버튼 */}
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? '가입 처리 중...' : '회원가입'}
            </Button>

            {/* 로그인 링크 */}
            <div className="text-center text-sm text-gray-600">
              이미 계정이 있으신가요?{' '}
              <a href="/auth/login" className="text-blue-600 hover:underline">
                로그인
              </a>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
