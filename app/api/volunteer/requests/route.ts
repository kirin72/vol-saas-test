/**
 * 배정 요청 API
 * POST /api/volunteer/requests - 교체/삭제 요청 생성
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST: 교체/삭제 요청 생성
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || session.user.role !== 'VOLUNTEER') {
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
    const { assignmentId, type, notes } = body;

    // 유효성 검사
    if (!assignmentId || !type) {
      return NextResponse.json(
        { error: 'Assignment ID and type are required' },
        { status: 400 }
      );
    }

    if (!['CHANGE', 'DELETE'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid request type' },
        { status: 400 }
      );
    }

    // 배정이 본인의 것인지 확인
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment || assignment.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Assignment not found or unauthorized' },
        { status: 404 }
      );
    }

    // 이미 요청이 있는지 확인
    const existingRequest = await prisma.assignmentRequest.findFirst({
      where: {
        assignmentId,
        userId: session.user.id,
        status: 'PENDING',
      },
    });

    if (existingRequest) {
      return NextResponse.json(
        { error: '이미 처리 대기 중인 요청이 있습니다' },
        { status: 400 }
      );
    }

    // 요청 생성
    const assignmentRequest = await prisma.assignmentRequest.create({
      data: {
        organizationId,
        assignmentId,
        userId: session.user.id,
        type,
        notes,
        status: 'PENDING',
      },
    });

    return NextResponse.json(assignmentRequest, { status: 201 });
  } catch (error) {
    console.error('요청 생성 오류:', error);
    return NextResponse.json(
      { error: 'Failed to create request' },
      { status: 500 }
    );
  }
}
