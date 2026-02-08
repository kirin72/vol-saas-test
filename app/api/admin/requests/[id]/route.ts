/**
 * 개별 요청 관리 API
 * PATCH /api/admin/requests/[id] - 요청 승인/거절
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// PATCH: 요청 승인/거절
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    // params를 await로 unwrap
    const { id } = await params;
    const body = await request.json();
    const { status, adminNotes } = body;

    // 유효성 검사
    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    // 요청 조회
    const assignmentRequest = await prisma.assignmentRequest.findUnique({
      where: { id },
    });

    if (!assignmentRequest || assignmentRequest.organizationId !== organizationId) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      );
    }

    if (assignmentRequest.status !== 'PENDING') {
      return NextResponse.json(
        { error: '이미 처리된 요청입니다' },
        { status: 400 }
      );
    }

    // 트랜잭션으로 처리
    const result = await prisma.$transaction(async (tx) => {
      // 1. 요청 상태 업데이트
      const updatedRequest = await tx.assignmentRequest.update({
        where: { id },
        data: {
          status,
          adminNotes,
        },
      });

      // 2. 승인된 경우 배정 삭제
      if (status === 'APPROVED') {
        await tx.assignment.delete({
          where: { id: assignmentRequest.assignmentId },
        });
      }

      return updatedRequest;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('요청 처리 오류:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
