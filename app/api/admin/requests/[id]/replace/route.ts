/**
 * 봉사자 교체 API
 * POST /api/admin/requests/[id]/replace
 *
 * - 기존 배정을 새 봉사자로 교체
 * - 요청 상태를 APPROVED로 변경
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
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

    const body = await request.json();
    const { newVolunteerId } = body;

    if (!newVolunteerId) {
      return NextResponse.json(
        { error: 'New volunteer ID is required' },
        { status: 400 }
      );
    }

    // params를 await로 unwrap
    const { id } = await params;

    // 요청 정보 조회
    const assignmentRequest = await prisma.assignmentRequest.findUnique({
      where: { id },
    });

    if (!assignmentRequest || assignmentRequest.organizationId !== organizationId) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      );
    }

    // 배정 정보 조회
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentRequest.assignmentId },
    });

    if (!assignment) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      );
    }

    // 트랜잭션으로 기존 배정 업데이트 및 요청 승인 처리
    const result = await prisma.$transaction(async (tx) => {
      // 기존 배정의 봉사자를 새 봉사자로 변경
      const updatedAssignment = await tx.assignment.update({
        where: { id: assignment.id },
        data: {
          userId: newVolunteerId,
        },
        include: {
          user: {
            select: {
              name: true,
              baptismalName: true,
            },
          },
        },
      });

      // 요청 상태를 APPROVED로 변경
      const updatedRequest = await tx.assignmentRequest.update({
        where: { id },
        data: {
          status: 'APPROVED',
          adminNotes: `${updatedAssignment.user.name}${
            updatedAssignment.user.baptismalName
              ? ` (${updatedAssignment.user.baptismalName})`
              : ''
          }님으로 교체됨`,
        },
      });

      return { updatedAssignment, updatedRequest };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('봉사자 교체 오류:', error);
    return NextResponse.json(
      { error: 'Failed to replace volunteer' },
      { status: 500 }
    );
  }
}
