/**
 * 사용자 확인 API
 * 이메일 또는 이름으로 사용자를 검색하고, 여러 organization이 있으면 목록 반환
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { identifier, password } = body; // identifier: 이메일 또는 이름

    if (!identifier || !password) {
      return NextResponse.json(
        { error: '아이디와 비밀번호를 입력해주세요' },
        { status: 400 }
      );
    }

    // 이메일 형식인지 확인 (간단한 정규식)
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);

    let users;

    if (isEmail) {
      // 이메일로 검색 (단일 사용자)
      const user = await prisma.user.findUnique({
        where: { email: identifier },
        include: {
          organization: true,
          // 봉사 역할 정보 포함 (성당 선택 화면에 표시용)
          userRoles: {
            include: {
              volunteerRole: {
                select: { name: true, color: true, isActive: true },
              },
            },
          },
        },
      });

      users = user ? [user] : [];
    } else {
      // 이름으로 검색 (여러 사용자 가능)
      users = await prisma.user.findMany({
        where: {
          name: identifier,
          status: 'ACTIVE',
        },
        include: {
          organization: true,
          // 봉사 역할 정보 포함 (성당 선택 화면에 표시용)
          userRoles: {
            include: {
              volunteerRole: {
                select: { name: true, color: true, isActive: true },
              },
            },
          },
        },
      });
    }

    if (users.length === 0) {
      return NextResponse.json(
        { error: '사용자를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 비밀번호 검증 및 유효한 사용자 필터링
    const validUsers = [];
    for (const user of users) {
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (isPasswordValid && user.status === 'ACTIVE') {
        // 활성 봉사 역할 목록 추출
        const volunteerRoles = (user as any).userRoles
          ?.map((ur: any) => ur.volunteerRole)
          .filter((role: any) => role?.isActive)
          .map((role: any) => ({ name: role.name, color: role.color })) || [];

        validUsers.push({
          id: user.id,
          name: user.name,
          email: user.email,
          organizationId: user.organizationId,
          organizationName: user.organization?.name || '알 수 없음',
          role: user.role,
          volunteerRoles, // 봉사 가능 역할 목록
        });
      }
    }

    if (validUsers.length === 0) {
      return NextResponse.json(
        { error: '비밀번호가 일치하지 않습니다' },
        { status: 401 }
      );
    }

    // 단일 사용자면 바로 로그인 가능
    if (validUsers.length === 1) {
      return NextResponse.json({
        success: true,
        needsOrganizationSelection: false,
        user: validUsers[0],
      });
    }

    // 여러 사용자면 organization 선택 필요
    return NextResponse.json({
      success: true,
      needsOrganizationSelection: true,
      users: validUsers,
    });
  } catch (error) {
    console.error('사용자 확인 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
