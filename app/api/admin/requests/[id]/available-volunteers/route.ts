/**
 * 교체 가능한 봉사자 목록 API
 * GET /api/admin/requests/[id]/available-volunteers
 *
 * - 해당 역할이 가능한 봉사자만 조회
 * - 같은 날짜/시간에 이미 배정된 봉사자는 제외
 * - 이번 달 배정 횟수 포함
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
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
      include: {
        massSchedule: true,
        volunteerRole: true,
      },
    });

    if (!assignment) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      );
    }
    const roleId = assignment.volunteerRole.id;
    const scheduleDate = assignment.massSchedule.date;
    const scheduleTime = assignment.massSchedule.time;

    // 해당 역할이 가능한 봉사자 조회
    const volunteersWithRole = await prisma.userRole_.findMany({
      where: {
        volunteerRoleId: roleId,
        user: {
          organizationId,
          role: 'VOLUNTEER',
          status: 'ACTIVE',
        },
      },
      select: {
        userId: true,
        user: {
          select: {
            id: true,
            name: true,
            baptismalName: true,
          },
        },
      },
    });

    const volunteerIds = volunteersWithRole.map((v) => v.userId);

    // 같은 날짜, 같은 시간에 이미 배정된 봉사자 조회
    const assignedVolunteers = await prisma.assignment.findMany({
      where: {
        organizationId,
        userId: { in: volunteerIds },
        massSchedule: {
          date: scheduleDate,
          time: scheduleTime,
        },
      },
      select: {
        userId: true,
      },
    });

    const assignedVolunteerIds = new Set(assignedVolunteers.map((a) => a.userId));

    // 이번 달 배정 횟수 조회
    const currentMonth = new Date();
    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

    const assignmentCounts = await prisma.assignment.groupBy({
      by: ['userId'],
      where: {
        organizationId,
        userId: { in: volunteerIds },
        massSchedule: {
          date: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
      },
      _count: {
        id: true,
      },
    });

    const countMap = new Map(
      assignmentCounts.map((ac) => [ac.userId, ac._count.id])
    );

    // 교체 가능한 봉사자 목록 (같은 시간에 배정되지 않은 봉사자만)
    const availableVolunteers = volunteersWithRole
      .filter((v) => !assignedVolunteerIds.has(v.userId))
      .map((v) => ({
        id: v.user.id,
        name: v.user.name,
        baptismalName: v.user.baptismalName,
        assignmentCount: countMap.get(v.userId) || 0,
      }))
      .sort((a, b) => a.assignmentCount - b.assignmentCount); // 배정 횟수 적은 순

    return NextResponse.json(availableVolunteers);
  } catch (error) {
    console.error('교체 가능한 봉사자 조회 오류:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available volunteers' },
      { status: 500 }
    );
  }
}
