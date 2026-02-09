/**
 * 피드백 데이터 검증 스키마 (Zod)
 * 사용자 피드백 작성 및 관리자 답장용
 */
import { z } from 'zod';

// 피드백 작성 스키마
export const feedbackCreateSchema = z.object({
  category: z.enum(['BUG', 'IMPROVEMENT', 'GENERAL'], {
    errorMap: () => ({ message: '카테고리를 선택해주세요' }),
  }),

  content: z
    .string()
    .min(5, '내용은 최소 5글자 이상이어야 합니다')
    .max(1000, '내용은 최대 1000글자까지 가능합니다'),
});

// 관리자 답장 스키마
export const feedbackReplySchema = z.object({
  reply: z
    .string()
    .min(1, '답장 내용을 입력해주세요')
    .max(1000, '답장은 최대 1000글자까지 가능합니다'),

  status: z
    .enum(['PENDING', 'REPLIED', 'CLOSED'])
    .optional()
    .default('REPLIED'),
});

// 카테고리 레이블
export const categoryLabels: Record<string, string> = {
  BUG: '버그 신고',
  IMPROVEMENT: '개선 제안',
  GENERAL: '일반 문의',
};

// 상태 레이블
export const statusLabels: Record<string, string> = {
  PENDING: '대기중',
  REPLIED: '답장완료',
  CLOSED: '종료',
};

// TypeScript 타입 추출
export type FeedbackCreateInput = z.infer<typeof feedbackCreateSchema>;
export type FeedbackReplyInput = z.infer<typeof feedbackReplySchema>;
