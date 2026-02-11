/**
 * 입출금 관리 타입 정의
 * 봉사자 단체의 회비 및 지출 관리를 위한 타입
 */

/**
 * 거래 유형
 * - income: 수입 (회비 등)
 * - expense: 지출
 * - balance_forward: 전월 이월금액 (매월 1일 자동 생성)
 */
export type TransactionType = 'income' | 'expense' | 'balance_forward';

/**
 * 입출금 거래 엔티티
 * DB의 Transaction 모델과 매핑됨
 */
export interface Transaction {
  id: string; // 거래 ID
  organizationId: string; // 본당 ID (Multi-tenancy)
  date: Date; // 거래 날짜
  type: TransactionType; // 거래 유형
  amount: number; // 금액 (원 단위, 정수)
  description: string; // 적요
  userId: string | null; // 봉사자 ID (수입 시, 선택적)
  recordedById: string | null; // 기록자 ID (관리자 또는 총무)
  createdAt: Date; // 생성 일시
  updatedAt: Date; // 수정 일시

  // Relations (populated)
  user?: {
    id: string;
    name: string;
  } | null;
  recordedBy?: {
    id: string;
    name: string;
    baptismalName: string | null;
  } | null;
}

/**
 * 월별 요약 정보
 * 수입/지출 합계 및 잔액 계산 결과
 */
export interface MonthlyFinanceSummary {
  year: number; // 년도 (예: 2026)
  month: number; // 월 (1-12)
  totalIncome: number; // 수입 합계 (원)
  totalExpense: number; // 지출 합계 (원)
  balanceForward: number; // 전월 이월금액 (원)
  balance: number; // 잔액 = (이월 + 수입) - 지출
}

/**
 * 년간 요약 정보
 * 특정 년도의 수입/지출 합계 및 잔액
 */
export interface YearlyFinanceSummary {
  year: number; // 년도 (예: 2026)
  totalIncome: number; // 수입 합계 (원)
  totalExpense: number; // 지출 합계 (원)
  balanceForward: number; // 전년도 이월금액 (원)
  balance: number; // 잔액 = (이월 + 수입) - 지출
}

/**
 * 전체 요약 정보
 * 모든 기간의 수입/지출 합계 및 잔액
 */
export interface AllFinanceSummary {
  totalIncome: number; // 전체 수입 합계 (원)
  totalExpense: number; // 전체 지출 합계 (원)
  balance: number; // 잔액 = 수입 - 지출
  firstTransactionDate: Date | null; // 최초 거래일
  lastTransactionDate: Date | null; // 최근 거래일
}

/**
 * 입출금 기록 생성 입력 데이터
 * React Hook Form 및 Server Action에서 사용
 */
export interface CreateTransactionInput {
  date: Date | string; // 거래 날짜 (문자열도 허용, Zod가 변환)
  type: 'income' | 'expense'; // 유형 (balance_forward는 자동 생성)
  amount: number; // 금액 (원 단위, 양수)
  description: string; // 적요 (1-200자)
  userId?: string; // 봉사자 ID (수입 시 선택적)
}

/**
 * Server Action 응답 타입 (성공)
 */
export interface FinanceActionSuccess<T> {
  success: true;
  data: T;
}

/**
 * Server Action 응답 타입 (실패)
 */
export interface FinanceActionError {
  success: false;
  error: string; // 사용자에게 표시할 에러 메시지
}

/**
 * Server Action 응답 타입 (통합)
 */
export type FinanceActionResult<T> =
  | FinanceActionSuccess<T>
  | FinanceActionError;
