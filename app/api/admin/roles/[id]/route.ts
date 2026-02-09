/**
 * 개별 역할 API
 * PATCH /api/admin/roles/[id] - 역할 수정
 * DELETE /api/admin/roles/[id] - 역할 삭제
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { roleUpdateSchema } from '@/lib/validations/role';

// PATCH: 역할 수정
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

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 400 });
    }

    // 역할 존재 및 권한 확인
    const existingRole = await prisma.volunteerRole.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!existingRole) {
      return NextResponse.json(
        { error: '역할을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 요청 본문 파싱 및 검증
    const body = await request.json();
    const validatedData = roleUpdateSchema.parse(body);

    // 역할명 중복 확인 (자기 자신 제외)
    if (validatedData.name !== existingRole.name) {
      const duplicateRole = await prisma.volunteerRole.findFirst({
        where: {
          organizationId,
          name: validatedData.name,
          id: { not: id },
        },
      });

      if (duplicateRole) {
        return NextResponse.json(
          { error: '이미 사용 중인 역할명입니다' },
          { status: 400 }
        );
      }
    }

    // 역할 수정
    const updatedRole = await prisma.volunteerRole.update({
      where: { id },
      data: {
        name: validatedData.name,
        description: validatedData.description || null,
        color: validatedData.color,
        sortOrder: validatedData.sortOrder,
        genderPreference: validatedData.genderPreference || 'NONE', // 성별 우선 배정
        isActive: validatedData.isActive,
      },
    });

    console.log('역할 수정 완료:', {
      id: updatedRole.id,
      name: updatedRole.name,
    });

    return NextResponse.json(updatedRole);
  } catch (error: any) {
    console.error('역할 수정 오류:', error);

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: '입력 데이터가 올바르지 않습니다', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update role' },
      { status: 500 }
    );
  }
}

// DELETE: 역할 삭제
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

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 400 });
    }

    // 역할 존재 및 권한 확인
    const role = await prisma.volunteerRole.findFirst({
      where: {
        id,
        organizationId,
      },
      include: {
        _count: {
          select: {
            userRoles: true,
          },
        },
      },
    });

    if (!role) {
      return NextResponse.json(
        { error: '역할을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 사용 중인 역할인지 확인
    if (role._count.userRoles > 0) {
      return NextResponse.json(
        {
          error: `이 역할을 가진 봉사자가 ${role._count.userRoles}명 있어 삭제할 수 없습니다`,
        },
        { status: 400 }
      );
    }

    // 역할 삭제
    await prisma.volunteerRole.delete({
      where: { id },
    });

    console.log('역할 삭제 완료:', {
      id: role.id,
      name: role.name,
    });

    return NextResponse.json({
      message: '역할이 삭제되었습니다',
      deleted: {
        id: role.id,
        name: role.name,
      },
    });
  } catch (error) {
    console.error('역할 삭제 오류:', error);
    return NextResponse.json(
      { error: 'Failed to delete role' },
      { status: 500 }
    );
  }
}
