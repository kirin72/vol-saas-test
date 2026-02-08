/**
 * 미사 일정 데이터 검증 스키마 (Zod)
 */
import { z } from 'zod';

// 역할별 필요 인원
export const roleRequirementSchema = z.object({
  roleId: z.string().min(1, '역할을 선택해주세요'),
  count: z.number().int().min(1, '최소 1명 이상이어야 합니다'),
});

// 미사 일정 생성 스키마
export const scheduleCreateSchema = z.object({
  date: z.string().min(1, '날짜를 선택해주세요'),

  time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, '올바른 시간 형식이 아닙니다 (예: 10:00)'),

  massType: z.enum(['WEEKDAY', 'SATURDAY', 'SUNDAY', 'SPECIAL'], {
    errorMap: () => ({ message: '미사 종류를 선택해주세요' }),
  }),

  notes: z.string().max(500, '메모는 최대 500자까지 가능합니다').optional().or(z.literal('')),

  requiredRoles: z
    .array(roleRequirementSchema)
    .optional()
    .default([]),
});

// 미사 일정 수정 스키마 (동일)
export const scheduleUpdateSchema = scheduleCreateSchema;

// TypeScript 타입 추출
export type ScheduleCreateInput = z.infer<typeof scheduleCreateSchema>;
export type ScheduleUpdateInput = z.infer<typeof scheduleUpdateSchema>;
export type RoleRequirement = z.infer<typeof roleRequirementSchema>;

// 미사 종류 한글 변환
export const massTypeLabels: Record<string, string> = {
  WEEKDAY: '평일미사',
  SATURDAY: '토요일미사',
  SUNDAY: '주일미사',
  SPECIAL: '특전미사',
};
