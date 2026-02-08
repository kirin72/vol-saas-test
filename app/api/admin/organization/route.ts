/**
 * API: 현재 관리자의 성당 정보 조회
 * GET /api/admin/organization
 */
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // 현재 세션 확인
    const session = await auth();

    if (!session || !session.user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    // 관리자만 접근 가능
    if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: '관리자만 접근할 수 있습니다.' },
        { status: 403 }
      );
    }

    // Super Admin은 organizationId가 없으므로 특별 처리
    if (session.user.role === 'SUPER_ADMIN') {
      return NextResponse.json({
        id: null,
        name: '총괄 관리',
        groupName: null,
      });
    }

    const organizationId = session.user.organizationId;

    if (!organizationId) {
      return NextResponse.json(
        { error: '성당 정보가 없습니다.' },
        { status: 400 }
      );
    }

    // 성당 정보 조회
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        groupName: true,
      },
    });

    if (!organization) {
      return NextResponse.json(
        { error: '성당을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json(organization);
  } catch (error) {
    console.error('성당 정보 조회 오류:', error);
    return NextResponse.json(
      { error: '성당 정보 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
