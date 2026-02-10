/**
 * 개별 미사 일정 API
 * GET /api/admin/schedules/[id] - 일정 상세 조회
 * PATCH /api/admin/schedules/[id] - 일정 수정
 * DELETE /api/admin/schedules/[id] - 일정 삭제
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { scheduleUpdateSchema } from '@/lib/validations/schedule';

// GET: 일정 상세 조회
export async function GET(
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

    // 일정 조회
    const schedule = await prisma.massSchedule.findFirst({
      where: {
        id,
        organizationId,
      },
      include: {
        massTemplate: {
          include: {
            slots: {
              include: {
                volunteerRole: true,
              },
            },
          },
        },
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                baptismalName: true,
              },
            },
            volunteerRole: true,
          },
        },
      },
    });

    if (!schedule) {
      return NextResponse.json(
        { error: '일정을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    return NextResponse.json(schedule);
  } catch (error) {
    console.error('일정 조회 오류:', error);
    return NextResponse.json(
      { error: 'Failed to fetch schedule' },
      { status: 500 }
    );
  }
}

// PATCH: 일정 수정
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

    // 일정 존재 확인
    const existingSchedule = await prisma.massSchedule.findFirst({
      where: {
        id,
        organizationId,
      },
      include: {
        massTemplate: true,
      },
    });

    if (!existingSchedule) {
      return NextResponse.json(
        { error: '일정을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 요청 본문 파싱 및 검증
    const body = await request.json();
    const validatedData = scheduleUpdateSchema.parse(body);

    // 트랜잭션으로 템플릿 + 슬롯 + 일정 수정
    const updatedSchedule = await prisma.$transaction(async (tx) => {
      const templateId = existingSchedule.massTemplateId;

      if (templateId) {
        // 1. 기존 슬롯 삭제
        await tx.templateSlot.deleteMany({
          where: { massTemplateId: templateId },
        });

        // 2. 새 슬롯 생성
        await tx.templateSlot.createMany({
          data: validatedData.requiredRoles.map((role) => ({
            massTemplateId: templateId,
            volunteerRoleId: role.roleId,
            requiredCount: role.count,
          })),
        });

        // 3. 템플릿 수정 (제의 색상 포함)
        await tx.massTemplate.update({
          where: { id: templateId },
          data: {
            name: `${validatedData.date} ${validatedData.time} 미사`,
            massType: validatedData.massType,
            time: validatedData.time,
            vestmentColor: validatedData.vestmentColor || null,
          },
        });
      }

      // 4. 일정 수정
      return await tx.massSchedule.update({
        where: { id },
        data: {
          date: new Date(validatedData.date),
          time: validatedData.time,
          notes: validatedData.notes || null,
        },
        include: {
          massTemplate: {
            include: {
              slots: {
                include: {
                  volunteerRole: true,
                },
              },
            },
          },
        },
      });
    });

    console.log('일정 수정 완료:', {
      id: updatedSchedule.id,
      date: updatedSchedule.date,
    });

    return NextResponse.json(updatedSchedule);
  } catch (error: any) {
    console.error('일정 수정 오류:', error);

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: '입력 데이터가 올바르지 않습니다', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update schedule' },
      { status: 500 }
    );
  }
}

// DELETE: 일정 삭제
export async function DELETE(
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

    // 일정 존재 확인
    const schedule = await prisma.massSchedule.findFirst({
      where: {
        id,
        organizationId,
      },
      include: {
        massTemplate: true,
        _count: {
          select: {
            assignments: true,
          },
        },
      },
    });

    if (!schedule) {
      return NextResponse.json(
        { error: '일정을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 배정된 봉사자가 있으면 경고
    if (schedule._count.assignments > 0) {
      return NextResponse.json(
        {
          error: `이 일정에 ${schedule._count.assignments}명의 봉사자가 배정되어 있어 삭제할 수 없습니다`,
        },
        { status: 400 }
      );
    }

    // 트랜잭션으로 일정 + 템플릿 + 슬롯 삭제
    await prisma.$transaction(async (tx) => {
      // 1. 일정 삭제
      await tx.massSchedule.delete({
        where: { id },
      });

      // 2. 템플릿 및 슬롯 삭제 (Cascade로 자동 삭제됨)
      if (schedule.massTemplateId) {
        await tx.massTemplate.delete({
          where: { id: schedule.massTemplateId },
        });
      }
    });

    console.log('일정 삭제 완료:', {
      id: schedule.id,
      date: schedule.date,
    });

    return NextResponse.json({
      message: '일정이 삭제되었습니다',
      deleted: {
        id: schedule.id,
        date: schedule.date,
      },
    });
  } catch (error) {
    console.error('일정 삭제 오류:', error);
    return NextResponse.json(
      { error: 'Failed to delete schedule' },
      { status: 500 }
    );
  }
}
