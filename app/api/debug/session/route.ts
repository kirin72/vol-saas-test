/**
 * 디버그용 세션 확인 API
 * 현재 세션 정보를 확인합니다
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      hasSession: !!session,
      session: session || null,
      user: session?.user || null,
      cookies: request.cookies.getAll(),
      headers: {
        host: request.headers.get('host'),
        'x-forwarded-host': request.headers.get('x-forwarded-host'),
        'x-forwarded-proto': request.headers.get('x-forwarded-proto'),
      },
    }, { status: 200 });
  } catch (error) {
    console.error('세션 확인 오류:', error);
    return NextResponse.json({
      error: '세션 확인 중 오류 발생',
      message: error instanceof Error ? error.message : '알 수 없는 오류',
    }, { status: 500 });
  }
}
