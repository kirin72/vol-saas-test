/**
 * 역할 관리 API
 * GET /api/admin/roles - 역할 목록 조회
 * POST /api/admin/roles - 역할 생성
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { roleCreateSchema } from '@/lib/validations/role';

// GET: 역할 목록 조회
export async function GET(request: NextRequest) {
  try {
    // 세션 확인
    const session = await auth();

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organizationId = session.user.organizationId;

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }

    // 역할 목록 조회 (모든 필드 포함)
    const roles = await prisma.volunteerRole.findMany({
      where: {
        organizationId,
      },
      orderBy: {
        sortOrder: 'asc',
      },
      include: {
        _count: {
          select: {
            userRoles: true, // 이 역할을 가진 봉사자 수
          },
        },
      },
    });

    return NextResponse.json(roles);
  } catch (error) {
    console.error('역할 목록 조회 오류:', error);
    return NextResponse.json(
      { error: 'Failed to fetch roles' },
      { status: 500 }
    );
  }
}

// POST: 역할 생성
export async function POST(request: NextRequest) {
  try {
    // 세션 확인
    const session = await auth();

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organizationId = session.user.organizationId;

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }

    // 요청 본문 파싱 및 검증
    const body = await request.json();
    const validatedData = roleCreateSchema.parse(body);

    // 역할명 중복 확인
    const existingRole = await prisma.volunteerRole.findFirst({
      where: {
        organizationId,
        name: validatedData.name,
      },
    });

    if (existingRole) {
      return NextResponse.json(
        { error: '이미 사용 중인 역할명입니다' },
        { status: 400 }
      );
    }

    // 자동 정렬 순서 할당: 현재 최대값 + 1 (없으면 0)
    const maxSortOrderRole = await prisma.volunteerRole.findFirst({
      where: { organizationId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });

    const nextSortOrder = maxSortOrderRole ? maxSortOrderRole.sortOrder + 1 : 0;

    // 역할 생성
    const role = await prisma.volunteerRole.create({
      data: {
        organizationId,
        name: validatedData.name,
        description: validatedData.description || null,
        color: validatedData.color,
        sortOrder: nextSortOrder, // 자동 할당
        isActive: true, // 기본값 true
      },
    });

    console.log('역할 생성 완료:', {
      id: role.id,
      name: role.name,
    });

    return NextResponse.json(role, { status: 201 });
  } catch (error: any) {
    console.error('역할 생성 오류:', error);

    // Zod 검증 오류
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: '입력 데이터가 올바르지 않습니다', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create role' },
      { status: 500 }
    );
  }
}
