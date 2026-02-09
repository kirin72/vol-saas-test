/**
 * 사용자 피드백 API
 * GET /api/feedback - 내 피드백 목록 조회
 * POST /api/feedback - 피드백 작성
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { feedbackCreateSchema } from '@/lib/validations/feedback';

// GET: 내 피드백 목록 조회
export async function GET() {
  try {
    // 세션 확인
    const session = await auth();

    if (!session || !session.user.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 내 피드백 목록 (최신순)
    const feedbacks = await prisma.feedback.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(feedbacks);
  } catch (error) {
    console.error('피드백 목록 조회 오류:', error);
    return NextResponse.json(
      { error: '피드백 목록 조회에 실패했습니다' },
      { status: 500 }
    );
  }
}

// POST: 피드백 작성
export async function POST(request: NextRequest) {
  try {
    // 세션 확인
    const session = await auth();

    if (!session || !session.user.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 요청 본문 파싱 및 검증
    const body = await request.json();
    const validatedData = feedbackCreateSchema.parse(body);

    // 피드백 생성
    const feedback = await prisma.feedback.create({
      data: {
        organizationId: session.user.organizationId,
        userId: session.user.id,
        category: validatedData.category,
        content: validatedData.content,
      },
    });

    return NextResponse.json(feedback, { status: 201 });
  } catch (error: any) {
    console.error('피드백 작성 오류:', error);

    // Zod 검증 오류
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: '입력 데이터가 올바르지 않습니다', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: '피드백 작성에 실패했습니다' },
      { status: 500 }
    );
  }
}
