/**
 * 미사 템플릿 활성/비활성 토글 API
 * PATCH /api/admin/templates/[id]/toggle-active
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// PATCH: 활성/비활성 토글
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const organizationId = session.user.organizationId;

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }

    // 기존 템플릿 확인
    const existingTemplate = await prisma.massTemplate.findFirst({
      where: { id, organizationId },
    });

    if (!existingTemplate) {
      return NextResponse.json(
        { error: '템플릿을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // isActive 토글
    const updatedTemplate = await prisma.massTemplate.update({
      where: { id },
      data: {
        isActive: !existingTemplate.isActive,
      },
    });

    console.log('템플릿 활성 상태 변경:', {
      id,
      isActive: updatedTemplate.isActive,
    });

    return NextResponse.json(updatedTemplate);
  } catch (error) {
    console.error('템플릿 활성 상태 변경 오류:', error);
    return NextResponse.json(
      { error: 'Failed to toggle template active status' },
      { status: 500 }
    );
  }
}
