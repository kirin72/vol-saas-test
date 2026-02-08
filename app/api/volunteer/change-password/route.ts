/**
 * API: 봉사자 비밀번호 변경
 * POST /api/volunteer/change-password
 *
 * 현재 비밀번호 확인 후 새 비밀번호로 변경
 * 첫 로그인 플래그도 함께 업데이트
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    // 현재 세션 확인
    const session = await auth();

    if (!session || !session.user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    // 봉사자만 접근 가능 (관리자는 별도 페이지 필요)
    if (session.user.role !== 'VOLUNTEER') {
      return NextResponse.json(
        { error: '봉사자만 접근할 수 있습니다.' },
        { status: 403 }
      );
    }

    const userId = session.user.id;
    const { currentPassword, newPassword } = await request.json();

    // 입력 검증
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: '현재 비밀번호와 새 비밀번호를 입력해주세요.' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: '새 비밀번호는 최소 6자 이상이어야 합니다.' },
        { status: 400 }
      );
    }

    // 사용자 정보 조회
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 현재 비밀번호 확인
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: '현재 비밀번호가 올바르지 않습니다.' },
        { status: 400 }
      );
    }

    // 새 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 비밀번호 업데이트 및 첫 로그인 플래그 false로 변경
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        isFirstLogin: false,
      },
    });

    return NextResponse.json({
      success: true,
      message: '비밀번호가 성공적으로 변경되었습니다.',
    });
  } catch (error) {
    console.error('비밀번호 변경 오류:', error);
    return NextResponse.json(
      { error: '비밀번호 변경 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
