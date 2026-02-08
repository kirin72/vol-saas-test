/**
 * 봉사자 정보 API
 * GET /api/volunteer/info - 봉사자 정보 조회
 * PATCH /api/volunteer/info - 봉사자 정보 수정
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET: 봉사자 정보 조회
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || session.user.role !== 'VOLUNTEER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        availableThisMonth: true,
        preferredDays: true,
        unavailableDays: true,
        unavailableDates: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('봉사자 정보 조회 오류:', error);
    return NextResponse.json(
      { error: 'Failed to fetch volunteer info' },
      { status: 500 }
    );
  }
}

// PATCH: 봉사자 정보 수정
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || session.user.role !== 'VOLUNTEER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { availableThisMonth, preferredDays, unavailableDays, unavailableDates } = body;

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        availableThisMonth,
        preferredDays: preferredDays || [],
        unavailableDays: unavailableDays || [],
        unavailableDates: unavailableDates || [],
      },
      select: {
        availableThisMonth: true,
        preferredDays: true,
        unavailableDays: true,
        unavailableDates: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('봉사자 정보 수정 오류:', error);
    return NextResponse.json(
      { error: 'Failed to update volunteer info' },
      { status: 500 }
    );
  }
}
