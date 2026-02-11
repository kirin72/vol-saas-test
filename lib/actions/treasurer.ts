/**
 * 총무 관리 Server Actions
 * - 총무 조회/지정/해제
 * - 현재 로그인 봉사자의 총무 여부 확인
 */
'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

// 총무 정보 타입
export interface TreasurerInfo {
  id: string;
  name: string;
  baptismalName: string | null;
}

// Server Action 응답 타입
interface ActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * 현재 조직의 총무 정보 조회 (ADMIN 전용)
 */
export async function getTreasurer(): Promise<ActionResult<TreasurerInfo | null>> {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'ADMIN') {
      return { success: false, error: '권한이 없습니다.' };
    }

    const organizationId = session.user.organizationId;
    if (!organizationId) {
      return { success: false, error: '본당 정보를 찾을 수 없습니다.' };
    }

    // 조직의 총무 정보 조회
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        treasurer: {
          select: {
            id: true,
            name: true,
            baptismalName: true,
          },
        },
      },
    });

    return {
      success: true,
      data: org?.treasurer || null,
    };
  } catch (error) {
    console.error('getTreasurer error:', error);
    return { success: false, error: '총무 정보를 불러오는데 실패했습니다.' };
  }
}

/**
 * 총무 지정/변경/해제 (ADMIN 전용)
 * @param userId 총무로 지정할 봉사자 ID (null이면 해제)
 */
export async function setTreasurer(userId: string | null): Promise<ActionResult<void>> {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'ADMIN') {
      return { success: false, error: '권한이 없습니다.' };
    }

    const organizationId = session.user.organizationId;
    if (!organizationId) {
      return { success: false, error: '본당 정보를 찾을 수 없습니다.' };
    }

    // userId가 있으면 해당 봉사자가 같은 조직 소속인지 확인
    if (userId) {
      const user = await prisma.user.findFirst({
        where: {
          id: userId,
          organizationId,
          status: 'ACTIVE',
        },
      });

      if (!user) {
        return { success: false, error: '해당 봉사자를 찾을 수 없습니다.' };
      }
    }

    // 조직의 treasurerId 업데이트
    await prisma.organization.update({
      where: { id: organizationId },
      data: { treasurerId: userId },
    });

    // 캐시 갱신
    revalidatePath('/admin/volunteers');

    return { success: true };
  } catch (error) {
    console.error('setTreasurer error:', error);
    return { success: false, error: '총무 설정에 실패했습니다.' };
  }
}

/**
 * 현재 로그인한 봉사자가 총무인지 확인 (VOLUNTEER용)
 */
export async function checkIsTreasurer(): Promise<boolean> {
  try {
    const session = await auth();
    if (!session || !session.user.organizationId) return false;

    // ADMIN도 총무 기능을 확인할 수 있도록 허용
    const org = await prisma.organization.findUnique({
      where: { id: session.user.organizationId },
      select: { treasurerId: true },
    });

    return org?.treasurerId === session.user.id;
  } catch (error) {
    console.error('checkIsTreasurer error:', error);
    return false;
  }
}
