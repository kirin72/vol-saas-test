/**
 * 미사 템플릿 API
 * GET /api/admin/templates - 템플릿 목록 조회
 * POST /api/admin/templates - 템플릿 생성
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { templateCreateSchema } from '@/lib/validations/template';

// GET: 템플릿 목록 조회
export async function GET(request: NextRequest) {
  try {
    // 세션 확인
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

    // 템플릿 목록 조회 (슬롯 + 역할 정보 포함)
    const templates = await prisma.massTemplate.findMany({
      where: { organizationId },
      orderBy: [
        { isActive: 'desc' },  // 활성 템플릿 먼저
        { createdAt: 'desc' }, // 최신순
      ],
      include: {
        // 역할별 슬롯 정보
        slots: {
          include: {
            volunteerRole: true,
          },
          orderBy: {
            volunteerRole: {
              sortOrder: 'asc',
            },
          },
        },
        // 이 템플릿을 사용하는 일정 수
        _count: {
          select: {
            massSchedules: true,
          },
        },
      },
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error('템플릿 목록 조회 오류:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

// POST: 템플릿 생성
export async function POST(request: NextRequest) {
  try {
    // 세션 확인
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

    // 요청 본문 파싱 및 검증
    const body = await request.json();
    const validatedData = templateCreateSchema.parse(body);

    // 중복 이름 체크 (같은 조직 내)
    const existingTemplate = await prisma.massTemplate.findFirst({
      where: {
        organizationId,
        name: validatedData.name,
      },
    });

    if (existingTemplate) {
      return NextResponse.json(
        { error: '동일한 이름의 템플릿이 이미 존재합니다.' },
        { status: 409 }
      );
    }

    // 트랜잭션으로 템플릿 + 슬롯 동시 생성
    const template = await prisma.$transaction(async (tx) => {
      // 1. 템플릿 생성
      const newTemplate = await tx.massTemplate.create({
        data: {
          organizationId,
          name: validatedData.name,
          massType: validatedData.massType,
          dayOfWeek: validatedData.dayOfWeek && validatedData.dayOfWeek.length > 0
            ? validatedData.dayOfWeek
            : Prisma.JsonNull,
          time: validatedData.time,
          isActive: true,
        },
      });

      // 2. 역할별 슬롯 생성
      if (validatedData.slots.length > 0) {
        await tx.templateSlot.createMany({
          data: validatedData.slots.map((slot) => ({
            massTemplateId: newTemplate.id,
            volunteerRoleId: slot.volunteerRoleId,
            requiredCount: slot.requiredCount,
          })),
        });
      }

      // 3. 생성된 템플릿을 슬롯 정보와 함께 반환
      return tx.massTemplate.findUnique({
        where: { id: newTemplate.id },
        include: {
          slots: {
            include: {
              volunteerRole: true,
            },
          },
          _count: {
            select: {
              massSchedules: true,
            },
          },
        },
      });
    });

    console.log('템플릿 생성 완료:', {
      id: template?.id,
      name: template?.name,
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error: any) {
    console.error('템플릿 생성 오류:', error);

    // Zod 검증 오류
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: '입력 데이터가 올바르지 않습니다', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    );
  }
}
