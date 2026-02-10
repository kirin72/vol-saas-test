/**
 * 미사 템플릿 데이터 검증 스키마 (Zod)
 * 템플릿 생성/수정 및 월간 일정 자동 생성 검증
 */
import { z } from 'zod';

// 템플릿 슬롯 (역할별 필요 인원) 스키마
export const templateSlotSchema = z.object({
  // 봉사 역할 ID
  volunteerRoleId: z.string().min(1, '역할을 선택해주세요'),
  // 필요 인원수 (최소 1명)
  requiredCount: z.number().int().min(1, '최소 1명 이상이어야 합니다'),
});

// 미사 템플릿 생성 스키마
export const templateCreateSchema = z.object({
  // 템플릿 이름 (예: "주일 오전 10시 미사")
  name: z
    .string()
    .min(1, '템플릿 이름은 필수입니다')
    .max(100, '템플릿 이름은 최대 100글자까지 가능합니다'),

  // 미사 종류 (평일/토요일/주일/특전)
  massType: z.enum(['WEEKDAY', 'SATURDAY', 'SUNDAY', 'SPECIAL'], {
    errorMap: () => ({ message: '미사 종류를 선택해주세요' }),
  }),

  // 반복 요일 배열 (선택사항 - 빈 배열이면 특정 요일 없음)
  dayOfWeek: z
    .array(z.enum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']))
    .nullable()
    .optional()
    .default(null),

  // 미사 시간 (HH:mm 형식)
  time: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, '올바른 시간 형식이 아닙니다 (예: 10:00)'),

  // 제의 색상 (선택사항)
  vestmentColor: z
    .enum(['WHITE', 'RED', 'GREEN', 'PURPLE', 'ROSE', 'BLACK', 'GOLD'])
    .nullable()
    .optional()
    .default(null),

  // 역할별 필요 인원 (최소 1개 역할 필수)
  slots: z
    .array(templateSlotSchema)
    .min(1, '최소 1개 이상의 역할을 선택해주세요'),
});

// 미사 템플릿 수정 스키마 (동일)
export const templateUpdateSchema = templateCreateSchema;

// 월간 일정 자동 생성 스키마
export const generateSchedulesSchema = z.object({
  // 템플릿 ID
  templateId: z.string().min(1, '템플릿을 선택해주세요'),
  // 연도
  year: z.number().int().min(2020).max(2100),
  // 월 (1~12)
  month: z.number().int().min(1).max(12),
});

// TypeScript 타입 추출
export type TemplateCreateInput = z.infer<typeof templateCreateSchema>;
export type TemplateUpdateInput = z.infer<typeof templateUpdateSchema>;
export type TemplateSlotInput = z.infer<typeof templateSlotSchema>;
export type GenerateSchedulesInput = z.infer<typeof generateSchedulesSchema>;

// 요일 한글 변환
export const dayOfWeekLabels: Record<string, string> = {
  MONDAY: '월요일',
  TUESDAY: '화요일',
  WEDNESDAY: '수요일',
  THURSDAY: '목요일',
  FRIDAY: '금요일',
  SATURDAY: '토요일',
  SUNDAY: '일요일',
};

// 제의 색상 라벨
export const vestmentColorLabels: Record<string, string> = {
  WHITE: '백색',
  RED: '홍색',
  GREEN: '녹색',
  PURPLE: '자색',
  ROSE: '장미색',
  BLACK: '검정색',
  GOLD: '황금색',
};

// 제의 색상 → 실제 CSS 색상 코드 매핑
export const vestmentColorCodes: Record<string, string> = {
  WHITE: '#FFFFFF',
  RED: '#DC2626',
  GREEN: '#16A34A',
  PURPLE: '#7C3AED',
  ROSE: '#F472B6',
  BLACK: '#1F2937',
  GOLD: '#EAB308',
};

// 요일 → 숫자 변환 (Date.getDay() 기준: 일=0, 월=1, ...)
export const dayOfWeekToNumber: Record<string, number> = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
};
