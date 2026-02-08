/**
 * API: 역할 활성/비활성 토글
 * PATCH /api/admin/roles/[id]/toggle-active
 *
 * 역할의 isActive 상태를 반전
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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

    // isActive 상태 반전
    const updatedRole = await prisma.volunteerRole.update({
      where: { id },
      data: {
        isActive: !existingRole.isActive,
      },
    });

    console.log('역할 활성 상태 변경 완료:', {
      id: updatedRole.id,
      name: updatedRole.name,
      isActive: updatedRole.isActive,
    });

    return NextResponse.json(updatedRole);
  } catch (error) {
    console.error('역할 활성 상태 변경 오류:', error);
    return NextResponse.json(
      { error: '역할 활성 상태 변경 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
