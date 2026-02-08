/**
 * 봉사자 배정 데이터 검증 스키마 (Zod)
 */
import { z } from 'zod';

// 배정 생성 스키마
export const assignmentCreateSchema = z.object({
  massScheduleId: z.string().min(1, '미사 일정을 선택해주세요'),
  userId: z.string().min(1, '봉사자를 선택해주세요'),
  volunteerRoleId: z.string().min(1, '역할을 선택해주세요'),
  status: z
    .enum(['ASSIGNED', 'CONFIRMED', 'REJECTED', 'COMPLETED'])
    .default('ASSIGNED'),
  notes: z.string().max(200, '메모는 최대 200자까지 가능합니다').optional(),
});

// 일괄 배정 생성 스키마
export const assignmentBulkCreateSchema = z.object({
  assignments: z.array(assignmentCreateSchema).min(1, '최소 1개 이상의 배정이 필요합니다'),
});

// TypeScript 타입 추출
export type AssignmentCreateInput = z.infer<typeof assignmentCreateSchema>;
export type AssignmentBulkCreateInput = z.infer<typeof assignmentBulkCreateSchema>;

// 배정 상태 한글 변환
export const assignmentStatusLabels: Record<string, string> = {
  ASSIGNED: '배정됨',
  CONFIRMED: '확인됨',
  REJECTED: '거절됨',
  COMPLETED: '완료됨',
};
