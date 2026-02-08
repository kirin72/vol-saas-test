/**
 * API: 첫 로그인 플래그 업데이트
 * POST /api/auth/update-first-login
 *
 * 봉사자가 비밀번호 변경 안내를 확인한 후 isFirstLogin을 false로 업데이트
 */
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST() {
  try {
    // 현재 세션 확인
    const session = await auth();

    if (!session || !session.user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // isFirstLogin을 false로 업데이트
    await prisma.user.update({
      where: { id: userId },
      data: { isFirstLogin: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('첫 로그인 플래그 업데이트 오류:', error);
    return NextResponse.json(
      { error: '업데이트 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
