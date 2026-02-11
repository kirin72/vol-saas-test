/**
 * API: 역할 활성/비활성 토글
 * PATCH /api/admin/roles/[id]/toggle-active
 *
 * 역할의 isActive 상태를 반전하고,
 * 모든 미사 템플릿의 TemplateSlot도 동기화
 * - 활성화: 모든 활성 미사 템플릿에 TemplateSlot 추가
 * - 비활성화: 해당 역할의 TemplateSlot 모두 제거
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

    // 새로운 활성 상태
    const newIsActive = !existingRole.isActive;

    // 트랜잭션으로 역할 상태 변경 + TemplateSlot 동기화
    const updatedRole = await prisma.$transaction(async (tx) => {
      // 1. isActive 상태 반전
      const role = await tx.volunteerRole.update({
        where: { id },
        data: { isActive: newIsActive },
      });

      // 2. TemplateSlot 동기화
      if (newIsActive) {
        // 활성화: 모든 활성 미사 템플릿에 이 역할의 슬롯 추가
        const activeTemplates = await tx.massTemplate.findMany({
          where: { organizationId, isActive: true },
          select: { id: true },
        });

        // 이미 존재하는 슬롯은 skipDuplicates로 건너뜀
        if (activeTemplates.length > 0) {
          await tx.templateSlot.createMany({
            data: activeTemplates.map((t) => ({
              massTemplateId: t.id,
              volunteerRoleId: id,
              requiredCount: 1,
            })),
            skipDuplicates: true,
          });
        }
      } else {
        // 비활성화: 해당 역할의 TemplateSlot 모두 제거
        await tx.templateSlot.deleteMany({
          where: { volunteerRoleId: id },
        });
      }

      return role;
    });

    console.log('역할 활성 상태 변경 완료:', {
      id: updatedRole.id,
      name: updatedRole.name,
      isActive: updatedRole.isActive,
      templateSlotSync: newIsActive ? '슬롯 추가됨' : '슬롯 제거됨',
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
