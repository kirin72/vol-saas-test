/**
 * 개별 봉사자 API
 * GET /api/admin/volunteers/[id] - 상세 조회
 * PATCH /api/admin/volunteers/[id] - 수정
 * DELETE /api/admin/volunteers/[id] - 삭제
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { volunteerUpdateSchema } from '@/lib/validations/volunteer';
import bcrypt from 'bcryptjs';

// GET: 봉사자 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organizationId = session.user.organizationId;

    // 봉사자 조회
    const volunteer = await prisma.user.findFirst({
      where: {
        id,
        organizationId,
        role: 'VOLUNTEER',
      },
      include: {
        userRoles: {
          include: {
            volunteerRole: true,
          },
        },
      },
    });

    if (!volunteer) {
      return NextResponse.json(
        { error: '봉사자를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    return NextResponse.json(volunteer);
  } catch (error) {
    console.error('봉사자 조회 오류:', error);
    return NextResponse.json(
      { error: 'Failed to fetch volunteer' },
      { status: 500 }
    );
  }
}

// PATCH: 봉사자 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organizationId = session.user.organizationId;

    // 봉사자 존재 확인
    const existingVolunteer = await prisma.user.findFirst({
      where: {
        id,
        organizationId,
        role: 'VOLUNTEER',
      },
    });

    if (!existingVolunteer) {
      return NextResponse.json(
        { error: '봉사자를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 요청 본문 파싱
    const body = await request.json();

    // Zod 검증
    const validatedData = volunteerUpdateSchema.parse(body);

    // 이메일 중복 확인 (이메일 변경 시)
    if (
      validatedData.email &&
      validatedData.email !== existingVolunteer.email
    ) {
      const duplicateUser = await prisma.user.findUnique({
        where: { email: validatedData.email },
      });

      if (duplicateUser) {
        return NextResponse.json(
          { error: '이미 사용 중인 이메일입니다' },
          { status: 400 }
        );
      }
    }

    // 비밀번호 해시 (비밀번호가 제공된 경우만)
    let hashedPassword: string | undefined;
    if (validatedData.password) {
      hashedPassword = await bcrypt.hash(validatedData.password, 10);
    }

    // 트랜잭션으로 봉사자 수정 + 역할 재할당
    const updatedVolunteer = await prisma.$transaction(async (tx) => {
      // 1. 기존 역할 삭제
      await tx.userRole_.deleteMany({
        where: { userId: id },
      });

      // 2. 새 역할 할당
      await tx.userRole_.createMany({
        data: validatedData.roleIds.map((roleId) => ({
          userId: id,
          volunteerRoleId: roleId,
        })),
      });

      // 3. 봉사자 정보 수정
      return await tx.user.update({
        where: { id },
        data: {
          name: validatedData.name,
          baptismalName: validatedData.baptismalName || null,
          email: validatedData.email || existingVolunteer.email,
          phone: validatedData.phone || null,
          password: hashedPassword || existingVolunteer.password,
          gender: validatedData.gender ?? null, // 성별
          status: validatedData.status,
          hasPaidDues: validatedData.hasPaidDues ?? existingVolunteer.hasPaidDues, // 회비 납부 여부
          // 봉사 가능 정보
          availableThisMonth: validatedData.availableThisMonth ?? null,
          preferredDays: validatedData.preferredDays ?? undefined,
          preferredTimes: validatedData.preferredTimes ?? undefined,
          unavailableDays: validatedData.unavailableDays ?? undefined,
          unavailableDates: validatedData.unavailableDates ?? undefined,
        },
        include: {
          userRoles: {
            include: {
              volunteerRole: true,
            },
          },
        },
      });
    });

    return NextResponse.json(updatedVolunteer);
  } catch (error: any) {
    console.error('봉사자 수정 오류:', error);

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: '입력 데이터가 올바르지 않습니다', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update volunteer' },
      { status: 500 }
    );
  }
}

// DELETE: 봉사자 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organizationId = session.user.organizationId;

    // 봉사자 존재 확인
    const volunteer = await prisma.user.findFirst({
      where: {
        id,
        organizationId,
        role: 'VOLUNTEER',
      },
    });

    if (!volunteer) {
      return NextResponse.json(
        { error: '봉사자를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 봉사자 삭제 (Cascade로 userRoles도 자동 삭제됨)
    const deletedUser = await prisma.user.delete({
      where: { id },
    });

    console.log('봉사자 삭제 완료:', {
      id: deletedUser.id,
      email: deletedUser.email,
      name: deletedUser.name,
    });

    return NextResponse.json({
      message: '봉사자가 삭제되었습니다',
      deleted: {
        id: deletedUser.id,
        email: deletedUser.email,
      }
    });
  } catch (error) {
    console.error('봉사자 삭제 오류:', error);
    return NextResponse.json(
      { error: 'Failed to delete volunteer' },
      { status: 500 }
    );
  }
}
