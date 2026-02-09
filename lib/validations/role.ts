/**
 * 봉사 역할 데이터 검증 스키마 (Zod)
 */
import { z } from 'zod';

// 역할 생성 스키마
export const roleCreateSchema = z.object({
  name: z
    .string()
    .min(1, '역할명은 최소 1글자 이상이어야 합니다')
    .max(50, '역할명은 최대 50글자까지 가능합니다'),

  description: z
    .string()
    .max(200, '설명은 최대 200글자까지 가능합니다')
    .optional()
    .or(z.literal('')),

  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, '올바른 색상 코드가 아닙니다 (예: #3B82F6)'),

  sortOrder: z
    .number()
    .int('정렬 순서는 정수여야 합니다')
    .min(0, '정렬 순서는 0 이상이어야 합니다')
    .default(0),

  genderPreference: z.enum(['NONE', 'MALE_PREFERRED', 'FEMALE_PREFERRED']).default('NONE'), // 성별 우선 배정

  isActive: z.boolean().default(true),
});

// 역할 수정 스키마 (동일)
export const roleUpdateSchema = roleCreateSchema;

// TypeScript 타입 추출
export type RoleCreateInput = z.infer<typeof roleCreateSchema>;
export type RoleUpdateInput = z.infer<typeof roleUpdateSchema>;

// 색상 프리셋 (4가지)
export const colorPresets = [
  { name: '파란색', value: '#3B82F6' },
  { name: '노란색', value: '#F59E0B' },
  { name: '빨간색', value: '#EF4444' },
  { name: '초록색', value: '#10B981' },
];
