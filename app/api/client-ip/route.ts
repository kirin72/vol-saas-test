/**
 * 클라이언트 IP 주소 확인 API
 * Super Admin 로그인 페이지에서 현재 IP 표시용
 */
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // IP 주소 추출 (프록시 환경 고려)
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1';

  return NextResponse.json({ ip });
}
