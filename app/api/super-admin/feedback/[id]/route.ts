/**
 * 총괄관리자 피드백 답장 API
 * PATCH /api/super-admin/feedback/[id] - 답장 작성 + 상태 변경
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { feedbackReplySchema } from '@/lib/validations/feedback';

// PATCH: 답장 작성 + 상태 변경
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 세션 확인 (SUPER_ADMIN만)
    const session = await auth();

    if (!session || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // 피드백 존재 확인
    const existing = await prisma.feedback.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: '피드백을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 요청 본문 파싱 및 검증
    const body = await request.json();
    const validatedData = feedbackReplySchema.parse(body);

    // 답장 저장
    const updated = await prisma.feedback.update({
      where: { id },
      data: {
        reply: validatedData.reply,
        status: validatedData.status || 'REPLIED',
        repliedAt: new Date(),
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('피드백 답장 오류:', error);

    // Zod 검증 오류
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: '입력 데이터가 올바르지 않습니다', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: '답장 작성에 실패했습니다' },
      { status: 500 }
    );
  }
}
