/**
 * 디버그용 환경변수 확인 API
 * 민감한 정보는 마스킹하여 표시합니다
 */
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const maskString = (str: string | undefined) => {
      if (!str) return '❌ 설정되지 않음';
      if (str.length <= 4) return '***';
      return str.substring(0, 3) + '***' + str.substring(str.length - 3);
    };

    const envCheck = {
      timestamp: new Date().toISOString(),
      nodeEnv: process.env.NODE_ENV,
      nextAuth: {
        url: process.env.NEXTAUTH_URL || '❌ 설정되지 않음',
        secret: maskString(process.env.NEXTAUTH_SECRET),
      },
      superAdmin: {
        email: maskString(process.env.SUPER_ADMIN_EMAIL),
        password: maskString(process.env.SUPER_ADMIN_PASSWORD),
        allowedIPs: process.env.SUPER_ADMIN_ALLOWED_IPS || '❌ 설정되지 않음',
      },
      database: {
        url: maskString(process.env.DATABASE_URL),
        directUrl: maskString(process.env.DIRECT_URL),
      },
    };

    return NextResponse.json(envCheck, { status: 200 });
  } catch (error) {
    console.error('환경변수 확인 오류:', error);
    return NextResponse.json({
      error: '환경변수 확인 중 오류 발생',
      message: error instanceof Error ? error.message : '알 수 없는 오류',
    }, { status: 500 });
  }
}
