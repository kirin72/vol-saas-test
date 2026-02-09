/**
 * 봉사자 목록 조회 및 생성 API
 * GET /api/admin/volunteers - 목록 조회
 * POST /api/admin/volunteers - 봉사자 생성
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { volunteerCreateSchema } from '@/lib/validations/volunteer';
import bcrypt from 'bcryptjs';

// GET: 봉사자 목록 조회
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

    // 쿼리 파라미터에서 역할 ID 가져오기 (선택사항)
    const { searchParams } = new URL(request.url);
    const roleId = searchParams.get('roleId');

    // WHERE 조건 구성
    const whereClause: any = {
      organizationId,
      role: 'VOLUNTEER',
      status: 'ACTIVE', // 활성 봉사자만
    };

    // 특정 역할을 가진 봉사자만 필터링
    if (roleId) {
      whereClause.userRoles = {
        some: {
          volunteerRoleId: roleId,
        },
      };
    }

    // 봉사자 목록 조회 (역할 포함)
    const volunteers = await prisma.user.findMany({
      where: whereClause,
      include: {
        userRoles: {
          include: {
            volunteerRole: true,
          },
        },
      },
      orderBy: {
        name: 'asc', // 이름순 정렬
      },
    });

    return NextResponse.json(volunteers);
  } catch (error) {
    console.error('봉사자 목록 조회 오류:', error);
    return NextResponse.json(
      { error: 'Failed to fetch volunteers' },
      { status: 500 }
    );
  }
}

// POST: 봉사자 생성
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

    // 요청 본문 파싱
    const body = await request.json();

    // Zod 검증
    const validatedData = volunteerCreateSchema.parse(body);

    // 이메일 중복 확인 (이메일이 제공된 경우)
    if (validatedData.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email: validatedData.email },
      });

      if (existingUser) {
        return NextResponse.json(
          { error: '이미 사용 중인 이메일입니다' },
          { status: 400 }
        );
      }
    }

    // 동명이인 체크 (이름 + 세례명이 같은 경우)
    // forceDuplicate 파라미터가 없으면 중복 체크 수행
    if (!body.forceDuplicate) {
      const duplicateCheck = await prisma.user.findFirst({
        where: {
          organizationId,
          role: 'VOLUNTEER',
          name: validatedData.name,
          // validatedData.baptismalName은 이제 undefined 또는 문자열 (빈 문자열 없음)
          // undefined인 경우 null로 변환하여 DB와 정확히 매칭
          baptismalName: validatedData.baptismalName ?? null,
        },
        select: {
          id: true,
          name: true,
          baptismalName: true,
        },
      });

      if (duplicateCheck) {
        return NextResponse.json(
          {
            error: 'DUPLICATE_NAME',
            message: '등록된 동일이름이 있습니다. 동명이인인지 확인해 주세요.',
            duplicate: duplicateCheck
          },
          { status: 409 } // 409 Conflict
        );
      }
    }

    // 비밀번호: 미입력 시 전화번호 010 제외 뒷 8자리로 자동 생성
    let finalPassword = validatedData.password;
    if (!finalPassword && validatedData.phone) {
      const digits = validatedData.phone.replace(/\D/g, '');
      finalPassword = digits.length >= 11 ? digits.slice(3) : digits;
    }
    if (!finalPassword) {
      return NextResponse.json(
        { error: '비밀번호를 입력하거나 전화번호를 먼저 입력해주세요' },
        { status: 400 }
      );
    }
    const hashedPassword = await bcrypt.hash(finalPassword, 10);

    // 트랜잭션으로 봉사자 생성 + 역할 할당
    const volunteer = await prisma.$transaction(async (tx) => {
      // 1. 봉사자 생성
      const newVolunteer = await tx.user.create({
        data: {
          organizationId,
          email: validatedData.email ?? `volunteer-${Date.now()}@temp.com`, // 이메일 없으면 임시 이메일
          password: hashedPassword,
          name: validatedData.name,
          baptismalName: validatedData.baptismalName ?? null,
          phone: validatedData.phone ?? null,
          role: 'VOLUNTEER',
          gender: validatedData.gender ?? null, // 성별
          status: validatedData.status,
          hasPaidDues: validatedData.hasPaidDues ?? false, // 회비 납부 여부
        },
      });

      // 2. 역할 할당
      await tx.userRole_.createMany({
        data: validatedData.roleIds.map((roleId) => ({
          userId: newVolunteer.id,
          volunteerRoleId: roleId,
        })),
      });

      // 3. 역할 정보 포함하여 반환
      return await tx.user.findUnique({
        where: { id: newVolunteer.id },
        include: {
          userRoles: {
            include: {
              volunteerRole: true,
            },
          },
        },
      });
    });

    return NextResponse.json(volunteer, { status: 201 });
  } catch (error: any) {
    console.error('봉사자 생성 오류:', error);

    // Zod 검증 오류
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: '입력 데이터가 올바르지 않습니다', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create volunteer' },
      { status: 500 }
    );
  }
}
