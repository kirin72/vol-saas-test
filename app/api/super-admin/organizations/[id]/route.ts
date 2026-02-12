/**
 * Super Admin 개별 조직 API
 * GET /api/super-admin/organizations/[id] - 상세 조회
 * PATCH /api/super-admin/organizations/[id] - 수정
 * DELETE /api/super-admin/organizations/[id] - 삭제
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// GET: 조직 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();

    // Super Admin 권한 확인
    if (!session || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 조직 조회 (관리자 정보 포함)
    const organization = await prisma.organization.findUnique({
      where: { id },
      include: {
        subscriptions: {
          include: {
            plan: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 1, // 최신 구독 정보만
        },
        users: {
          where: {
            role: 'ADMIN', // 관리자만
          },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
          },
        },
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    if (!organization) {
      return NextResponse.json(
        { error: '조직을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    return NextResponse.json(organization);
  } catch (error) {
    console.error('조직 조회 오류:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organization' },
      { status: 500 }
    );
  }
}

// PATCH: 조직 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();

    // Super Admin 권한 확인
    if (!session || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      slug,
      phone,
      email,
      address,
      isActive,
      planId,
      subscriptionStatus,
      currentPeriodStart,
      adminName,
      adminEmail,
      adminPhone,
      adminPassword,
    } = body;

    // 트랜잭션으로 조직 + 구독 + 관리자 정보 업데이트
    const updatedOrganization = await prisma.$transaction(async (tx) => {
      // 1. 조직 정보 업데이트
      const org = await tx.organization.update({
        where: { id },
        data: {
          name,
          slug,
          phone: phone || null,
          email: email || null,
          address: address || null,
          isActive,
        },
      });

      // 2. 구독 정보 업데이트
      // 기존 구독 찾기
      const existingSubscription = await tx.subscription.findFirst({
        where: { organizationId: id },
        orderBy: { createdAt: 'desc' },
      });

      // 구독 시작일 계산
      const startDate = new Date(currentPeriodStart);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1); // 1개월 후

      if (existingSubscription) {
        // 기존 구독 업데이트
        await tx.subscription.update({
          where: { id: existingSubscription.id },
          data: {
            planId,
            status: subscriptionStatus,
            currentPeriodStart: startDate,
            currentPeriodEnd: endDate,
          },
        });
      } else {
        // 구독이 없으면 새로 생성
        await tx.subscription.create({
          data: {
            organizationId: id,
            planId,
            status: subscriptionStatus,
            currentPeriodStart: startDate,
            currentPeriodEnd: endDate,
          },
        });
      }

      // 3. 관리자 정보 업데이트
      // 기존 관리자 찾기
      const existingAdmin = await tx.user.findFirst({
        where: {
          organizationId: id,
          role: 'ADMIN',
        },
      });

      // 비밀번호 해시 (변경 시에만)
      const updateData: any = {
        name: adminName,
        email: adminEmail,
        phone: adminPhone || null,
      };

      if (adminPassword) {
        updateData.password = await bcrypt.hash(adminPassword, 10);
      }

      if (existingAdmin) {
        // 기존 관리자 정보 업데이트
        await tx.user.update({
          where: { id: existingAdmin.id },
          data: updateData,
        });
      } else {
        // 관리자가 없으면 새로 생성
        await tx.user.create({
          data: {
            organizationId: id,
            email: adminEmail,
            password: await bcrypt.hash(adminPassword || 'changeme123', 10),
            name: adminName,
            phone: adminPhone || null,
            role: 'ADMIN',
            status: 'ACTIVE',
          },
        });
      }

      return org;
    });

    console.log('조직 수정 완료:', {
      id: updatedOrganization.id,
      name: updatedOrganization.name,
    });

    return NextResponse.json(updatedOrganization);
  } catch (error: any) {
    console.error('조직 수정 오류:', error);

    // Unique 제약조건 위반 (slug 중복)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: '이미 사용 중인 URL 식별자입니다' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update organization' },
      { status: 500 }
    );
  }
}

// DELETE: 조직 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();

    // Super Admin 권한 확인
    if (!session || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 조직 존재 확인
    const organization = await prisma.organization.findUnique({
      where: { id },
    });

    if (!organization) {
      return NextResponse.json(
        { error: '조직을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 조직 삭제 (Cascade로 관련 데이터 모두 삭제됨)
    await prisma.organization.delete({
      where: { id },
    });

    console.log('조직 삭제 완료:', {
      id: organization.id,
      name: organization.name,
    });

    return NextResponse.json({
      message: '조직이 삭제되었습니다',
      deleted: {
        id: organization.id,
        name: organization.name,
      },
    });
  } catch (error) {
    console.error('조직 삭제 오류:', error);
    return NextResponse.json(
      { error: 'Failed to delete organization' },
      { status: 500 }
    );
  }
}
