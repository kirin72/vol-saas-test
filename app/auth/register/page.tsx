/**
 * 조직 회원가입 페이지
 * 조직(Organization) + 관리자 계정(User) 동시 생성
 * 성당 디렉토리 검색 + 자동 매칭 지원
 */
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// 성당 디렉토리 검색 결과 타입
interface ChurchDirectoryResult {
  id: string;
  diocese: string;
  name: string;
  address: string | null;
  phone: string | null;
  sundayMass: string | null;
  weekdayMass: string | null;
}

// 전화번호 자동 포맷 (숫자만 입력해도 000-0000-0000 형식으로 변환)
function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11); // 숫자만, 최대 11자리
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

// 성당 이름에 "성당" 접미사를 붙여주는 헬퍼
// "명동" → "명동성당", "명동성당" → "명동성당" (중복 방지)
function ensureChurchSuffix(name: string): string {
  if (!name) return '';
  return name.endsWith('성당') ? name : `${name}성당`;
}

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  // 조직 정보
  const [orgName, setOrgName] = useState(''); // 사용자가 입력하는 원본 값
  const [orgGroupName, setOrgGroupName] = useState(''); // 조직이름 (예: 독서단)
  const [orgAddress, setOrgAddress] = useState('');

  // 성당 디렉토리 매칭 관련 상태
  const [churchDirectoryId, setChurchDirectoryId] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<ChurchDirectoryResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isMatched, setIsMatched] = useState(false); // 매칭 성공 여부
  const [searching, setSearching] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 관리자 정보
  const [adminName, setAdminName] = useState('');
  const [adminBaptismalName, setAdminBaptismalName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminPasswordConfirm, setAdminPasswordConfirm] = useState('');

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 성당 디렉토리 검색 (debounced 300ms)
  const searchChurchDirectory = useCallback(async (query: string) => {
    // 2글자 미만이면 검색하지 않음
    if (query.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    setSearching(true);
    try {
      const res = await fetch(`/api/church-directory/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const results: ChurchDirectoryResult[] = await res.json();
        setSearchResults(results);
        setShowDropdown(results.length > 0);
      }
    } catch {
      // 검색 실패는 무시 (네트워크 오류 등)
    } finally {
      setSearching(false);
    }
  }, []);

  // 조직명 변경 핸들러 + 성당 검색
  const handleOrgNameChange = (value: string) => {
    setOrgName(value);

    // 매칭 상태 초기화 (직접 타이핑 시)
    if (isMatched) {
      setIsMatched(false);
      setChurchDirectoryId(null);
    }

    // debounced 성당 검색
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      searchChurchDirectory(value);
    }, 300);
  };

  // 성당 선택 시 자동 입력
  const handleSelectChurch = (church: ChurchDirectoryResult) => {
    // 성당 이름 설정 (그대로 저장)
    setOrgName(church.name);
    setChurchDirectoryId(church.id);
    setIsMatched(true);
    setShowDropdown(false);

    // 주소 자동 입력 (데이터가 있는 경우만)
    if (church.address) {
      setOrgAddress(church.address);
    } else if (church.diocese === '수원교구' && church.name.includes('오산')) {
      // 수원교구 오산성당 주소 수동 매핑 (DB에 없는 경우)
      setOrgAddress('경기 오산시 가장로 727');
    }
  };

  // slug 자동 생성 (본당 이름 + 조직이름 기반, 타임스탬프로 고유성 보장)
  const generateSlug = () => {
    const base = `${orgName}-${orgGroupName}`.trim();
    const slug = base
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9가-힣-]/g, '');
    // 한글이 포함된 경우 랜덤 문자열 추가
    const suffix = Date.now().toString(36).slice(-4);
    return slug ? `${slug}-${suffix}` : `org-${suffix}`;
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

    // 본당 이름에 "성당" 접미사 보장
    const finalOrgName = ensureChurchSuffix(orgName);

    setLoading(true);

    try {
      const response = await fetch('/api/organizations/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization: {
            name: finalOrgName,
            groupName: orgGroupName,
            slug: generateSlug(),
            address: orgAddress,
          },
          admin: {
            name: adminName,
            baptismalName: adminBaptismalName || undefined,
            email: adminEmail,
            phone: adminPhone,
            password: adminPassword,
          },
          // 성당 디렉토리 매칭 ID (매칭된 경우에만)
          churchDirectoryId: churchDirectoryId || undefined,
          // 조직이름 (역할 자동 선택용)
          groupName: orgGroupName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '회원가입에 실패했습니다.');
      }

      // 회원가입 성공 → 확인 메시지 표시
      setShowSuccessDialog(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 회원가입 성공 다이얼로그 확인 핸들러
  const handleSuccessConfirm = async () => {
    setShowSuccessDialog(false);
    setLoading(true);

    // 자동 로그인 시도
    const loginResult = await signIn('credentials', {
      email: adminEmail,
      password: adminPassword,
      redirect: false,
    });

    if (loginResult?.ok) {
      // 로그인 성공 → 관리자 대시보드로 이동
      window.location.href = '/admin/dashboard';
    } else {
      // 자동 로그인 실패 시 로그인 페이지로 이동
      router.push('/auth/login');
    }
  };

  // 표시용 본당 이름 (왼쪽 상단 표시)
  const displayOrgName = orgName ? ensureChurchSuffix(orgName) : '';

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
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">조직 정보</h3>
                {/* 본당 이름 미리보기 (성당 접미사 포함) */}
                {displayOrgName && (
                  <span className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                    {displayOrgName}
                  </span>
                )}
              </div>
              <div className="space-y-4">
                {/* 본당 이름 + 자동완성 드롭다운 */}
                <div className="space-y-2 relative" ref={dropdownRef}>
                  <Label htmlFor="orgName">본당 이름 *</Label>
                  <div className="relative">
                    <Input
                      id="orgName"
                      type="text"
                      placeholder="명동 또는 명동성당"
                      value={orgName}
                      onChange={(e) => handleOrgNameChange(e.target.value)}
                      required
                      disabled={loading}
                      className={isMatched ? 'border-green-400 bg-green-50' : ''}
                      autoComplete="off"
                    />
                    {/* 검색 중 표시 */}
                    {searching && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    입력중 하단에 생성된 성당을 누르면 자동입력됩니다.
                  </p>

                  {/* 자동완성 드롭다운 */}
                  {showDropdown && searchResults.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {searchResults.map((church) => (
                        <button
                          key={church.id}
                          type="button"
                          className="w-full px-4 py-3 text-left hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors"
                          onClick={() => handleSelectChurch(church)}
                        >
                          <div className="font-medium text-gray-900">{church.name}</div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {church.diocese}
                            {church.address && ` · ${church.address.slice(0, 30)}...`}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 성당 매칭 성공 메시지 */}
                {isMatched && (
                  <div className="bg-green-50 border border-green-200 rounded-md p-3 text-sm text-green-700">
                    성당의 자료가 데이터베이스에 존재합니다.<br />
                    주소와 미사일정이 자동으로 입력됩니다.
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="orgGroupName">조직이름</Label>
                  <Input
                    id="orgGroupName"
                    type="text"
                    placeholder="예) 독서단, 복사단, 제대봉사단"
                    value={orgGroupName}
                    onChange={(e) => setOrgGroupName(e.target.value)}
                    disabled={loading}
                  />
                  <p className="text-xs text-gray-500">
                    조직이름에 따라 관련 봉사 역할이 자동 선택됩니다
                  </p>
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
                    className={isMatched && orgAddress ? 'border-green-300 bg-green-50/50' : ''}
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
                    <Label htmlFor="adminBaptismalName">세례명</Label>
                    <Input
                      id="adminBaptismalName"
                      type="text"
                      placeholder="요셉"
                      value={adminBaptismalName}
                      onChange={(e) => setAdminBaptismalName(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adminPhone">전화번호</Label>
                  <Input
                    id="adminPhone"
                    inputMode="numeric"
                    placeholder="010-1234-5678"
                    value={adminPhone}
                    onChange={(e) => setAdminPhone(formatPhone(e.target.value))}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="adminEmail">이메일 *</Label>
                    <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                      로그인 할때 이 이메일을 사용합니다
                    </span>
                  </div>
                  <Input
                    id="adminEmail"
                    type="email"
                    placeholder="admin@church.or.kr"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    required
                    disabled={loading}
                    autoComplete="username"
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
                      autoComplete="new-password"
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
                      autoComplete="new-password"
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

      {/* 회원가입 완료 다이얼로그 */}
      <AlertDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>회원가입이 완료되었습니다!</AlertDialogTitle>
            <AlertDialogDescription>
              관리자 대시보드로 이동합니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleSuccessConfirm}>
              확인
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
