/**
 * 조직 회원가입 API
 * Organization + Admin User + Free Subscription + 기본 역할 + 미사 템플릿/일정 동시 생성
 * 성당 디렉토리 매칭 시 자동으로 미사시간 데이터를 기반으로 템플릿과 일정을 생성
 * 조직이름(groupName) 기반 역할 자동 선택 지원
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { PlanType } from '@prisma/client';
import {
  DEFAULT_VOLUNTEER_ROLES,
  buildTemplateData,
  getDatesForDayOfWeek,
  dayOfWeekToNumber,
} from '@/lib/church-directory';

/**
 * 조직이름(groupName) 키워드 → 활성화할 역할 이름 배열 반환
 * 매칭되는 키워드가 없으면 null (= 모든 역할 활성화)
 */
function getActiveRolesForGroup(groupName: string | null | undefined): string[] | null {
  if (!groupName || !groupName.trim()) return null; // 조직이름 없으면 전체 활성
  const name = groupName.trim();
  const activeRoles: string[] = [];

  // 키워드 매핑: 조직이름에 포함된 단어 → 활성화할 역할
  if (name.includes('독서')) activeRoles.push('1독서', '2독서');
  if (name.includes('해설')) activeRoles.push('해설');
  if (name.includes('반주')) activeRoles.push('반주');
  if (name.includes('복사')) activeRoles.push('복사');
  if (name.includes('제대')) activeRoles.push('제대');
  if (name.includes('성체')) activeRoles.push('성체분배');
  if (name.includes('주차')) activeRoles.push('주차');
  if (name.includes('운전')) activeRoles.push('운전');

  // 매칭된 역할이 없으면 전체 활성화
  return activeRoles.length > 0 ? activeRoles : null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organization, admin, churchDirectoryId } = body;

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

    // 성당 디렉토리 매칭 데이터 조회 (churchDirectoryId가 있는 경우)
    let churchData = null;
    if (churchDirectoryId) {
      churchData = await prisma.churchDirectory.findUnique({
        where: { id: churchDirectoryId },
      });
    }

    // 트랜잭션으로 모든 데이터 동시 생성
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

      // 5. 기본 봉사 역할 9개 생성 (조직이름 기반 활성/비활성 결정)
      const activeRoleNames = getActiveRolesForGroup(organization.groupName);
      const createdRoles = [];
      for (const role of DEFAULT_VOLUNTEER_ROLES) {
        // activeRoleNames가 null이면 전체 활성, 아니면 매칭된 역할만 활성
        const isActive = activeRoleNames ? activeRoleNames.includes(role.name) : true;
        const created = await tx.volunteerRole.create({
          data: {
            organizationId: newOrg.id,
            name: role.name,
            description: role.description,
            color: role.color,
            sortOrder: role.sortOrder,
            genderPreference: 'NONE',
            isActive,
          },
        });
        createdRoles.push(created);
      }

      // 6. 성당 디렉토리 매칭이 있고, 미사시간 데이터가 있는 경우 → 템플릿 + 일정 자동 생성
      let templatesCreated = 0;
      let schedulesCreated = 0;

      if (churchData && (churchData.sundayMass || churchData.weekdayMass)) {
        // 미사시간 파싱 → MassTemplate 데이터 생성
        const templateDataList = buildTemplateData(
          churchData.sundayMass,
          churchData.weekdayMass,
          newOrg.name,
        );

        // 현재 연/월 (일정 생성용)
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1; // 1~12

        for (const tData of templateDataList) {
          // 미사 템플릿 생성
          const template = await tx.massTemplate.create({
            data: {
              organizationId: newOrg.id,
              name: tData.name,
              massType: tData.massType,
              dayOfWeek: tData.dayOfWeek.length > 0 ? tData.dayOfWeek : undefined,
              time: tData.time,
              isActive: true,
            },
          });

          // 활성 역할에 대해서만 슬롯 생성 (각 역할 1명씩)
          const activeRoles = createdRoles.filter((r) => r.isActive);
          await tx.templateSlot.createMany({
            data: activeRoles.map((role) => ({
              massTemplateId: template.id,
              volunteerRoleId: role.id,
              requiredCount: 1,
            })),
          });

          templatesCreated++;

          // 현재 월 일정 자동 생성
          for (const day of tData.dayOfWeek) {
            const dayNum = dayOfWeekToNumber[day];
            if (dayNum !== undefined) {
              const dates = getDatesForDayOfWeek(currentYear, currentMonth, dayNum);
              // 오늘 이후 날짜만 생성
              const futureDates = dates.filter(d => d >= now);

              if (futureDates.length > 0) {
                await tx.massSchedule.createMany({
                  data: futureDates.map((date) => ({
                    organizationId: newOrg.id,
                    massTemplateId: template.id,
                    date,
                    time: tData.time,
                  })),
                });
                schedulesCreated += futureDates.length;
              }
            }
          }
        }
      }

      return {
        organization: newOrg,
        admin: newAdmin,
        subscription,
        rolesCreated: createdRoles.length,
        templatesCreated,
        schedulesCreated,
        churchMatched: !!churchData,
      };
    });

    return NextResponse.json({
      message: '회원가입이 완료되었습니다.',
      data: {
        organizationId: result.organization.id,
        organizationSlug: result.organization.slug,
        rolesCreated: result.rolesCreated,
        templatesCreated: result.templatesCreated,
        schedulesCreated: result.schedulesCreated,
        churchMatched: result.churchMatched,
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
