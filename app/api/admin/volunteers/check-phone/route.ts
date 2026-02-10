/**
 * 전화번호 중복 확인 API
 * GET /api/admin/volunteers/check-phone?phone=010-1234-5678
 * 같은 조직 내 봉사자 중 동일 전화번호가 있는지 확인
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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

    // 쿼리 파라미터에서 전화번호 및 제외할 사용자 ID 가져오기
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');
    const excludeId = searchParams.get('excludeId'); // 수정 시 자기 자신 제외

    if (!phone || phone.trim().length < 10) {
      return NextResponse.json({ duplicate: false });
    }

    // 같은 조직 내 동일 전화번호 봉사자 검색
    const existing = await prisma.user.findFirst({
      where: {
        organizationId,
        role: 'VOLUNTEER',
        phone: phone.trim(),
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (existing) {
      return NextResponse.json({
        duplicate: true,
        volunteerName: existing.name,
      });
    }

    return NextResponse.json({ duplicate: false });
  } catch (error) {
    console.error('전화번호 중복 확인 오류:', error);
    return NextResponse.json(
      { error: 'Failed to check phone' },
      { status: 500 }
    );
  }
}
