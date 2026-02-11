/**
 * 입출금 관리 Server Actions
 * Next.js 15 App Router의 Server Actions로 API 구현
 */
'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { transactionSchema } from '@/lib/validations/finance';
import { revalidatePath } from 'next/cache';
import type {
  Transaction,
  CreateTransactionInput,
  MonthlyFinanceSummary,
  YearlyFinanceSummary,
  AllFinanceSummary,
  FinanceActionResult,
} from '@/types/finance';

/**
 * 입출금 관리 접근 권한 확인 헬퍼
 * ADMIN이면 바로 통과, VOLUNTEER이면 총무인지 DB에서 확인
 */
async function checkFinanceAccess(session: any): Promise<{
  allowed: boolean;
  organizationId: string | null;
  error?: string;
}> {
  if (!session?.user) {
    return { allowed: false, organizationId: null, error: '인증이 필요합니다.' };
  }

  const organizationId = session.user.organizationId;
  if (!organizationId) {
    return { allowed: false, organizationId: null, error: '본당 정보를 찾을 수 없습니다.' };
  }

  // ADMIN은 바로 통과
  if (session.user.role === 'ADMIN') {
    return { allowed: true, organizationId };
  }

  // VOLUNTEER인 경우 총무인지 확인
  if (session.user.role === 'VOLUNTEER') {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { treasurerId: true },
    });
    if (org?.treasurerId === session.user.id) {
      return { allowed: true, organizationId };
    }
  }

  return { allowed: false, organizationId: null, error: '권한이 없습니다.' };
}

/**
 * 월별 입출금 내역 조회
 * @param year 조회할 년도 (예: 2026)
 * @param month 조회할 월 (1-12)
 * @returns 입출금 내역 리스트 및 월별 요약 정보
 */
export async function getMonthlyTransactions(
  year: number,
  month: number
): Promise<
  FinanceActionResult<{
    transactions: Transaction[];
    summary: MonthlyFinanceSummary;
  }>
> {
  try {
    // 1. 세션 및 권한 확인 (ADMIN 또는 총무)
    const session = await auth();
    const access = await checkFinanceAccess(session);
    if (!access.allowed) {
      return { success: false, error: access.error! };
    }
    const organizationId = access.organizationId!;

    // 2. 해당 년월의 시작일/종료일 계산
    const startDate = new Date(year, month - 1, 1); // month는 0-based
    const endDate = new Date(year, month, 0, 23, 59, 59, 999); // 해당 월의 마지막 날

    // 3. 입출금 내역 조회 (organizationId + date 범위)
    const transactions = await prisma.transaction.findMany({
      where: {
        organizationId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        recordedBy: {
          select: {
            id: true,
            name: true,
            baptismalName: true,
          },
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    // 4. 전월 잔액 계산
    const balanceForward = await calculateBalanceForward(
      organizationId,
      year,
      month
    );

    // 5. 수입/지출 합계 계산
    let totalIncome = 0;
    let totalExpense = 0;

    for (const tx of transactions) {
      if (tx.type === 'income') {
        totalIncome += tx.amount;
      } else if (tx.type === 'expense') {
        totalExpense += tx.amount;
      }
      // balance_forward는 합계에서 제외
    }

    // 6. 잔액 계산
    const balance = balanceForward + totalIncome - totalExpense;

    // 7. 응답 반환
    return {
      success: true,
      data: {
        transactions: transactions as Transaction[],
        summary: {
          year,
          month,
          totalIncome,
          totalExpense,
          balanceForward,
          balance,
        },
      },
    };
  } catch (error) {
    console.error('getMonthlyTransactions error:', error);
    return {
      success: false,
      error: '데이터를 불러오는데 실패했습니다.',
    };
  }
}

/**
 * 입출금 기록 생성
 * @param input 입출금 기록 데이터
 * @returns 생성된 거래 정보
 */
export async function createTransaction(
  input: CreateTransactionInput
): Promise<FinanceActionResult<Transaction>> {
  try {
    // 1. 세션 및 권한 확인 (ADMIN 또는 총무)
    const session = await auth();
    const access = await checkFinanceAccess(session);
    if (!access.allowed) {
      return { success: false, error: access.error! };
    }
    const organizationId = access.organizationId!;

    // 2. Zod 스키마로 입력 검증
    const validationResult = transactionSchema.safeParse(input);
    if (!validationResult.success) {
      const errors = validationResult.error.errors;
      return {
        success: false,
        error: errors[0]?.message || '입력값이 올바르지 않습니다.',
      };
    }

    const validatedData = validationResult.data;

    // 3. userId가 있는 경우, 해당 봉사자가 본당 소속인지 확인
    if (validatedData.userId) {
      const user = await prisma.user.findFirst({
        where: {
          id: validatedData.userId,
          organizationId,
        },
      });

      if (!user) {
        return {
          success: false,
          error: '선택한 봉사자를 찾을 수 없습니다.',
        };
      }
    }

    // 4. Transaction 생성 (기록자 ID 자동 저장)
    const transaction = await prisma.transaction.create({
      data: {
        organizationId,
        date: new Date(validatedData.date), // 문자열을 Date 객체로 변환
        type: validatedData.type,
        amount: validatedData.amount,
        description: validatedData.description,
        userId: validatedData.userId,
        recordedById: session!.user.id, // 기록자 (관리자 또는 총무)
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        recordedBy: {
          select: {
            id: true,
            name: true,
            baptismalName: true,
          },
        },
      },
    });

    // 5. 수입 + 입금자가 있는 경우 회비 자동 업데이트
    if (validatedData.type === 'income' && validatedData.userId) {
      try {
        await prisma.user.update({
          where: { id: validatedData.userId },
          data: {
            hasPaidDues: true,
            lastPaidDate: new Date(validatedData.date),
          },
        });
      } catch (updateError) {
        console.error('회비 납부 상태 업데이트 실패:', updateError);
        // 입출금 기록은 정상 생성되었으므로 계속 진행
      }
    }

    // 6. 캐시 갱신 (관리자/봉사자 양쪽 경로)
    revalidatePath('/admin/finance');
    revalidatePath('/volunteer/finance');

    return {
      success: true,
      data: transaction as Transaction,
    };
  } catch (error) {
    console.error('createTransaction error:', error);
    return {
      success: false,
      error: '저장에 실패했습니다. 다시 시도해주세요.',
    };
  }
}

/**
 * 전월 잔액 계산
 * @param organizationId 본당 ID
 * @param year 조회할 년도
 * @param month 조회할 월
 * @returns 전월 이월금액
 */
async function calculateBalanceForward(
  organizationId: string,
  year: number,
  month: number
): Promise<number> {
  try {
    // 전월의 마지막 날짜 계산
    const previousMonthEnd = new Date(year, month - 1, 0, 23, 59, 59, 999);

    // 해당 날짜까지의 모든 거래 조회
    const transactions = await prisma.transaction.findMany({
      where: {
        organizationId,
        date: {
          lte: previousMonthEnd,
        },
        type: {
          not: 'balance_forward', // 이월금액은 제외 (중복 계산 방지)
        },
      },
      select: {
        type: true,
        amount: true,
      },
    });

    // 잔액 계산: (전체 수입 - 전체 지출)
    let balance = 0;
    for (const tx of transactions) {
      if (tx.type === 'income') {
        balance += tx.amount;
      } else if (tx.type === 'expense') {
        balance -= tx.amount;
      }
    }

    return balance;
  } catch (error) {
    console.error('calculateBalanceForward error:', error);
    return 0;
  }
}

/**
 * 년간 입출금 내역 조회
 * @param year 조회할 년도 (예: 2026)
 * @returns 년간 입출금 내역 리스트 및 요약 정보
 */
export async function getYearlyTransactions(
  year: number
): Promise<
  FinanceActionResult<{
    transactions: Transaction[];
    summary: YearlyFinanceSummary;
  }>
> {
  try {
    // 1. 세션 및 권한 확인 (ADMIN 또는 총무)
    const session = await auth();
    const access = await checkFinanceAccess(session);
    if (!access.allowed) {
      return { success: false, error: access.error! };
    }
    const organizationId = access.organizationId!;

    // 2. 해당 년도의 시작일/종료일 계산
    const startDate = new Date(year, 0, 1); // 1월 1일
    const endDate = new Date(year, 11, 31, 23, 59, 59, 999); // 12월 31일

    // 3. 입출금 내역 조회
    const transactions = await prisma.transaction.findMany({
      where: {
        organizationId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        recordedBy: {
          select: {
            id: true,
            name: true,
            baptismalName: true,
          },
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    // 4. 전년도 잔액 계산
    const previousYearEnd = new Date(year - 1, 11, 31, 23, 59, 59, 999);
    const previousTransactions = await prisma.transaction.findMany({
      where: {
        organizationId,
        date: {
          lte: previousYearEnd,
        },
        type: {
          not: 'balance_forward',
        },
      },
      select: {
        type: true,
        amount: true,
      },
    });

    let balanceForward = 0;
    for (const tx of previousTransactions) {
      if (tx.type === 'income') {
        balanceForward += tx.amount;
      } else if (tx.type === 'expense') {
        balanceForward -= tx.amount;
      }
    }

    // 5. 수입/지출 합계 계산
    let totalIncome = 0;
    let totalExpense = 0;

    for (const tx of transactions) {
      if (tx.type === 'income') {
        totalIncome += tx.amount;
      } else if (tx.type === 'expense') {
        totalExpense += tx.amount;
      }
    }

    // 6. 잔액 계산
    const balance = balanceForward + totalIncome - totalExpense;

    return {
      success: true,
      data: {
        transactions: transactions as Transaction[],
        summary: {
          year,
          totalIncome,
          totalExpense,
          balanceForward,
          balance,
        },
      },
    };
  } catch (error) {
    console.error('getYearlyTransactions error:', error);
    return {
      success: false,
      error: '데이터를 불러오는데 실패했습니다.',
    };
  }
}

/**
 * 전체 입출금 내역 조회
 * @returns 전체 입출금 내역 리스트 및 요약 정보
 */
export async function getAllTransactions(): Promise<
  FinanceActionResult<{
    transactions: Transaction[];
    summary: AllFinanceSummary;
  }>
> {
  try {
    // 1. 세션 및 권한 확인 (ADMIN 또는 총무)
    const session = await auth();
    const access = await checkFinanceAccess(session);
    if (!access.allowed) {
      return { success: false, error: access.error! };
    }
    const organizationId = access.organizationId!;

    // 2. 모든 입출금 내역 조회
    const transactions = await prisma.transaction.findMany({
      where: {
        organizationId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        recordedBy: {
          select: {
            id: true,
            name: true,
            baptismalName: true,
          },
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    // 3. 수입/지출 합계 및 날짜 범위 계산
    let totalIncome = 0;
    let totalExpense = 0;
    let firstTransactionDate: Date | null = null;
    let lastTransactionDate: Date | null = null;

    for (const tx of transactions) {
      if (tx.type === 'income') {
        totalIncome += tx.amount;
      } else if (tx.type === 'expense') {
        totalExpense += tx.amount;
      }

      if (!firstTransactionDate || tx.date < firstTransactionDate) {
        firstTransactionDate = tx.date;
      }
      if (!lastTransactionDate || tx.date > lastTransactionDate) {
        lastTransactionDate = tx.date;
      }
    }

    // 4. 잔액 계산
    const balance = totalIncome - totalExpense;

    return {
      success: true,
      data: {
        transactions: transactions as Transaction[],
        summary: {
          totalIncome,
          totalExpense,
          balance,
          firstTransactionDate,
          lastTransactionDate,
        },
      },
    };
  } catch (error) {
    console.error('getAllTransactions error:', error);
    return {
      success: false,
      error: '데이터를 불러오는데 실패했습니다.',
    };
  }
}

/**
 * 입금자 선택용 봉사자 목록 조회
 * @returns 봉사자 목록 (id, name)
 */
export async function getVolunteersForFinance(): Promise<
  FinanceActionResult<{ id: string; name: string }[]>
> {
  try {
    // 1. 세션 및 권한 확인 (ADMIN 또는 총무)
    const session = await auth();
    const access = await checkFinanceAccess(session);
    if (!access.allowed) {
      return { success: false, error: access.error! };
    }
    const organizationId = access.organizationId!;

    // 2. 해당 본당의 봉사자 + 관리자 목록 조회 (관리자도 입금자로 선택 가능)
    const volunteers = await prisma.user.findMany({
      where: {
        organizationId,
        role: { in: ['VOLUNTEER', 'ADMIN'] },
        status: 'ACTIVE',
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc', // 이름 가나다 순 정렬
      },
    });

    return {
      success: true,
      data: volunteers,
    };
  } catch (error) {
    console.error('getVolunteersForFinance error:', error);
    return {
      success: false,
      error: '봉사자 목록을 불러오는데 실패했습니다.',
    };
  }
}
