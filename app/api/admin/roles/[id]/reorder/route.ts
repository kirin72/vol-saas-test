/**
 * API: 역할 순서 변경
 * PATCH /api/admin/roles/[id]/reorder
 *
 * 역할의 sortOrder를 위/아래로 이동
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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

    // 역할 존재 및 권한 확인
    const currentRole = await prisma.volunteerRole.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!currentRole) {
      return NextResponse.json(
        { error: '역할을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 요청 본문에서 direction 가져오기 ('up' 또는 'down')
    const { direction } = await request.json();

    if (direction !== 'up' && direction !== 'down') {
      return NextResponse.json(
        { error: 'direction은 "up" 또는 "down"이어야 합니다' },
        { status: 400 }
      );
    }

    // 해당 조직의 모든 역할 조회 (sortOrder 순서대로)
    const allRoles = await prisma.volunteerRole.findMany({
      where: { organizationId },
      orderBy: { sortOrder: 'asc' },
    });

    // 현재 역할의 인덱스 찾기
    const currentIndex = allRoles.findIndex((r) => r.id === id);

    if (currentIndex === -1) {
      return NextResponse.json(
        { error: '역할을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 위로 이동
    if (direction === 'up') {
      if (currentIndex === 0) {
        return NextResponse.json(
          { error: '이미 첫 번째 역할입니다' },
          { status: 400 }
        );
      }

      const prevRole = allRoles[currentIndex - 1];

      // sortOrder 교환
      await prisma.$transaction([
        prisma.volunteerRole.update({
          where: { id: currentRole.id },
          data: { sortOrder: prevRole.sortOrder },
        }),
        prisma.volunteerRole.update({
          where: { id: prevRole.id },
          data: { sortOrder: currentRole.sortOrder },
        }),
      ]);
    }
    // 아래로 이동
    else if (direction === 'down') {
      if (currentIndex === allRoles.length - 1) {
        return NextResponse.json(
          { error: '이미 마지막 역할입니다' },
          { status: 400 }
        );
      }

      const nextRole = allRoles[currentIndex + 1];

      // sortOrder 교환
      await prisma.$transaction([
        prisma.volunteerRole.update({
          where: { id: currentRole.id },
          data: { sortOrder: nextRole.sortOrder },
        }),
        prisma.volunteerRole.update({
          where: { id: nextRole.id },
          data: { sortOrder: currentRole.sortOrder },
        }),
      ]);
    }

    console.log('역할 순서 변경 완료:', {
      id: currentRole.id,
      name: currentRole.name,
      direction,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('역할 순서 변경 오류:', error);
    return NextResponse.json(
      { error: '역할 순서 변경 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
