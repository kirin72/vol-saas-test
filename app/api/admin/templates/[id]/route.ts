/**
 * 미사 템플릿 상세 API
 * GET /api/admin/templates/[id] - 템플릿 상세 조회
 * PATCH /api/admin/templates/[id] - 템플릿 수정
 * DELETE /api/admin/templates/[id] - 템플릿 삭제
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { templateUpdateSchema } from '@/lib/validations/template';

// GET: 템플릿 상세 조회
export async function GET(
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

    // 템플릿 조회 (조직 ID 확인)
    const template = await prisma.massTemplate.findFirst({
      where: { id, organizationId },
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

    if (!template) {
      return NextResponse.json(
        { error: '템플릿을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json(template);
  } catch (error) {
    console.error('템플릿 상세 조회 오류:', error);
    return NextResponse.json(
      { error: 'Failed to fetch template' },
      { status: 500 }
    );
  }
}

// PATCH: 템플릿 수정
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

    // 요청 본문 파싱 및 검증
    const body = await request.json();
    const validatedData = templateUpdateSchema.parse(body);

    // 중복 이름 체크 (자기 자신 제외)
    const duplicateTemplate = await prisma.massTemplate.findFirst({
      where: {
        organizationId,
        name: validatedData.name,
        NOT: { id },
      },
    });

    if (duplicateTemplate) {
      return NextResponse.json(
        { error: '동일한 이름의 템플릿이 이미 존재합니다.' },
        { status: 409 }
      );
    }

    // 트랜잭션으로 템플릿 + 슬롯 수정
    const updatedTemplate = await prisma.$transaction(async (tx) => {
      // 1. 템플릿 정보 수정
      await tx.massTemplate.update({
        where: { id },
        data: {
          name: validatedData.name,
          massType: validatedData.massType,
          dayOfWeek: validatedData.dayOfWeek && validatedData.dayOfWeek.length > 0
            ? validatedData.dayOfWeek
            : Prisma.JsonNull,
          time: validatedData.time,
          vestmentColor: validatedData.vestmentColor || null,
        },
      });

      // 2. 기존 슬롯 모두 삭제
      await tx.templateSlot.deleteMany({
        where: { massTemplateId: id },
      });

      // 3. 새 슬롯 생성
      if (validatedData.slots.length > 0) {
        await tx.templateSlot.createMany({
          data: validatedData.slots.map((slot) => ({
            massTemplateId: id,
            volunteerRoleId: slot.volunteerRoleId,
            requiredCount: slot.requiredCount,
          })),
        });
      }

      // 4. 수정된 템플릿 반환
      return tx.massTemplate.findUnique({
        where: { id },
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

    console.log('템플릿 수정 완료:', {
      id: updatedTemplate?.id,
      name: updatedTemplate?.name,
    });

    return NextResponse.json(updatedTemplate);
  } catch (error: any) {
    console.error('템플릿 수정 오류:', error);

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: '입력 데이터가 올바르지 않습니다', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update template' },
      { status: 500 }
    );
  }
}

// DELETE: 템플릿 삭제
export async function DELETE(
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

    // 기존 템플릿 확인 (연결된 일정 수 포함)
    const existingTemplate = await prisma.massTemplate.findFirst({
      where: { id, organizationId },
      include: {
        _count: {
          select: {
            massSchedules: true,
          },
        },
      },
    });

    if (!existingTemplate) {
      return NextResponse.json(
        { error: '템플릿을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 연결된 일정이 있으면 삭제 불가
    if (existingTemplate._count.massSchedules > 0) {
      return NextResponse.json(
        {
          error: `이 템플릿을 사용하는 일정이 ${existingTemplate._count.massSchedules}개 있어 삭제할 수 없습니다. 먼저 관련 일정을 삭제해주세요.`,
        },
        { status: 400 }
      );
    }

    // 템플릿 삭제 (슬롯은 Cascade로 자동 삭제)
    await prisma.massTemplate.delete({
      where: { id },
    });

    console.log('템플릿 삭제 완료:', { id });

    return NextResponse.json({ message: '템플릿이 삭제되었습니다.' });
  } catch (error) {
    console.error('템플릿 삭제 오류:', error);
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    );
  }
}
