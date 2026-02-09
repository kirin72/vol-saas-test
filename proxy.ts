/**
 * Next.js Proxy (이전 Middleware)
 * 인증이 필요한 경로 보호
 */
import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const userRole = req.auth?.user?.role;

  // 인증이 필요한 경로
  const protectedPaths = ['/admin', '/super-admin', '/volunteer'];
  const isProtectedPath = protectedPaths.some((path) =>
    pathname.startsWith(path)
  );

  // 인증되지 않은 사용자가 보호된 경로에 접근 시도
  if (isProtectedPath && !isLoggedIn) {
    return NextResponse.redirect(new URL('/auth/login', req.url));
  }

  // Super Admin 전용 경로
  if (pathname.startsWith('/super-admin') && userRole !== 'SUPER_ADMIN') {
    return NextResponse.redirect(new URL('/auth/login', req.url));
  }

  // 본당 관리자 전용 경로
  if (pathname.startsWith('/admin') && userRole !== 'ADMIN') {
    return NextResponse.redirect(new URL('/auth/login', req.url));
  }

  // 봉사자 전용 경로
  if (pathname.startsWith('/volunteer') && userRole !== 'VOLUNTEER') {
    return NextResponse.redirect(new URL('/auth/login', req.url));
  }

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
