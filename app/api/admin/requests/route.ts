/**
 * 관리자 요청 관리 API
 * GET /api/admin/requests - 요청 목록 조회
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET: 요청 목록 조회
export async function GET(request: NextRequest) {
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

    // 요청 목록 조회
    const requests = await prisma.assignmentRequest.findMany({
      where: { organizationId },
      include: {
        user: {
          select: {
            name: true,
            baptismalName: true,
          },
        },
        // assignment 정보는 직접 조회 필요
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 각 요청에 대한 assignment 정보 조회
    const requestsWithAssignment = await Promise.all(
      requests.map(async (request) => {
        const assignment = await prisma.assignment.findUnique({
          where: { id: request.assignmentId },
          include: {
            massSchedule: {
              select: {
                date: true,
                time: true,
                massTemplate: {
                  select: {
                    massType: true,
                  },
                },
              },
            },
            volunteerRole: {
              select: {
                name: true,
                color: true,
              },
            },
          },
        });

        return {
          ...request,
          assignment,
        };
      })
    );

    return NextResponse.json(requestsWithAssignment);
  } catch (error) {
    console.error('요청 목록 조회 오류:', error);
    return NextResponse.json(
      { error: 'Failed to fetch requests' },
      { status: 500 }
    );
  }
}
