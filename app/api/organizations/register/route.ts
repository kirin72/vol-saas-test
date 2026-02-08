/**
 * 조직 회원가입 API
 * Organization + Admin User + Free Subscription 동시 생성
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { PlanType } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organization, admin } = body;

    // 유효성 검사
    if (!organization?.name || !organization?.slug || !admin?.email || !admin?.password) {
      return NextResponse.json(
        { error: '필수 정보가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // Slug 중복 확인
    const existingOrg = await prisma.organization.findUnique({
      where: { slug: organization.slug },
    });

    if (existingOrg) {
      return NextResponse.json(
        { error: '이미 사용 중인 URL 식별자입니다.' },
        { status: 400 }
      );
    }

    // 이메일 중복 확인
    const existingUser = await prisma.user.findUnique({
      where: { email: admin.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: '이미 사용 중인 이메일입니다.' },
        { status: 400 }
      );
    }

    // 비밀번호 해시
    const hashedPassword = await bcrypt.hash(admin.password, 10);

    // 트랜잭션으로 조직 + 관리자 + 구독 동시 생성
    const result = await prisma.$transaction(async (tx) => {
      // 1. 조직 생성
      const newOrg = await tx.organization.create({
        data: {
          name: organization.name,
          groupName: organization.groupName || null,
          slug: organization.slug,
          phone: organization.phone || null,
          email: organization.email || null,
          address: organization.address || null,
        },
      });

      // 2. 관리자 계정 생성
      const newAdmin = await tx.user.create({
        data: {
          organizationId: newOrg.id,
          email: admin.email,
          password: hashedPassword,
          name: admin.name,
          phone: admin.phone || null,
          role: 'ADMIN',
          status: 'ACTIVE',
        },
      });

      // 3. 무료 플랜 찾기
      const freePlan = await tx.plan.findUnique({
        where: { type: PlanType.FREE },
      });

      if (!freePlan) {
        throw new Error('무료 플랜을 찾을 수 없습니다.');
      }

      // 4. 무료 구독 생성
      const subscription = await tx.subscription.create({
        data: {
          organizationId: newOrg.id,
          planId: freePlan.id,
          status: 'ACTIVE',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(
            new Date().setMonth(new Date().getMonth() + 1)
          ),
        },
      });

      return { organization: newOrg, admin: newAdmin, subscription };
    });

    return NextResponse.json({
      message: '회원가입이 완료되었습니다.',
      data: {
        organizationId: result.organization.id,
        organizationSlug: result.organization.slug,
      },
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: error.message || '회원가입 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
