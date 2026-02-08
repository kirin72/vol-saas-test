/**
 * 개별 봉사자 배정 API
 * DELETE /api/admin/assignments/[id] - 배정 삭제
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// DELETE: 배정 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();

    // 권한 확인
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

    // 배정 존재 확인 (organizationId로 권한 검증)
    const assignment = await prisma.assignment.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!assignment) {
      return NextResponse.json(
        { error: '배정을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 배정 삭제
    const deletedAssignment = await prisma.assignment.delete({
      where: { id },
    });

    console.log('배정 삭제 완료:', {
      id: deletedAssignment.id,
      userId: deletedAssignment.userId,
      massScheduleId: deletedAssignment.massScheduleId,
    });

    return NextResponse.json({
      message: '배정이 삭제되었습니다',
      deleted: {
        id: deletedAssignment.id,
        userId: deletedAssignment.userId,
      },
    });
  } catch (error) {
    console.error('배정 삭제 오류:', error);
    return NextResponse.json(
      { error: 'Failed to delete assignment' },
      { status: 500 }
    );
  }
}
