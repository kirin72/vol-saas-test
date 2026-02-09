/**
 * Next.js Proxy (이전 Middleware)
 * 인증이 필요한 경로 보호
 */
import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const userRole = req.auth?.user?.role;

  // 디버깅 로그
  console.log('=== Proxy Middleware - Role Check ===');
  console.log('경로:', pathname);
  console.log('사용자 역할:', userRole);

  // Role 기반 접근 제어
  // Super Admin 전용 경로
  if (pathname.startsWith('/super-admin')) {
    if (userRole !== 'SUPER_ADMIN') {
      console.log('Super Admin 권한 없음 → 로그인 페이지로');
      return NextResponse.redirect(new URL('/auth/login', req.url));
    }
  }

  // 본당 관리자 전용 경로
  if (pathname.startsWith('/admin')) {
    if (userRole !== 'ADMIN') {
      console.log('Admin 권한 없음 → 로그인 페이지로');
      return NextResponse.redirect(new URL('/auth/login', req.url));
    }
  }

  // 봉사자 전용 경로
  if (pathname.startsWith('/volunteer')) {
    if (userRole !== 'VOLUNTEER') {
      console.log('Volunteer 권한 없음 → 로그인 페이지로');
      return NextResponse.redirect(new URL('/auth/login', req.url));
    }
  }

  console.log('권한 확인 완료 → 통과');
  return NextResponse.next();
});

// Proxy가 실행될 경로 설정
export const config = {
  matcher: [
    '/admin/:path*',
    '/super-admin/:path*',
    '/volunteer/:path*',
    '/api/admin/:path*',
    '/api/super-admin/:path*',
    '/api/volunteer/:path*',
  ],
};
