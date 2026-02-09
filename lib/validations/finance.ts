/**
 * 입출금 관리 Zod 검증 스키마
 * React Hook Form 및 Server Action에서 사용
 */
import { z } from 'zod';

/**
 * 입출금 기록 생성 폼 스키마
 * 클라이언트와 서버에서 이중 검증
 */
export const transactionSchema = z.object({
  // 거래 날짜 (필수) - HTML input[type=date]는 문자열 반환
  date: z.string({
    required_error: '날짜를 선택해주세요.',
  }).min(1, '날짜를 선택해주세요.'),

  // 거래 유형 (필수)
  type: z.enum(['income', 'expense'], {
    required_error: '거래 유형을 선택해주세요.',
    invalid_type_error: '수입 또는 지출을 선택해주세요.',
  }),

  // 금액 (필수, 양수, 정수, 1억원 이하)
  amount: z
    .number({
      required_error: '금액을 입력해주세요.',
      invalid_type_error: '올바른 숫자를 입력해주세요.',
    })
    .int('금액은 정수여야 합니다.')
    .positive('금액은 1원 이상이어야 합니다.')
    .max(100000000, '금액은 1억원 이하여야 합니다.'),

  // 적요 (필수, 1-200자)
  description: z
    .string({
      required_error: '적요를 입력해주세요.',
    })
    .min(1, '적요를 입력해주세요.')
    .max(200, '적요는 200자 이하여야 합니다.')
    .trim(),

  // 봉사자 ID (선택적, 수입 시만 사용)
  userId: z.string().optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
});

/**
 * transactionSchema의 TypeScript 타입 추론
 */
export type TransactionFormData = z.infer<typeof transactionSchema>;
