/**
 * 봉사자 데이터 검증 스키마 (Zod)
 * React Hook Form과 함께 사용
 */
import { z } from 'zod';

// 봉사자 생성 스키마
export const volunteerCreateSchema = z.object({
  name: z
    .string()
    .min(2, '이름은 최소 2글자 이상이어야 합니다')
    .max(50, '이름은 최대 50글자까지 가능합니다'),

  baptismalName: z
    .string()
    .min(1, '세례명은 최소 1글자 이상이어야 합니다')
    .max(50, '세례명은 최대 50글자까지 가능합니다')
    .optional()
    .or(z.literal(''))
    .transform(val => val === '' ? undefined : val), // 빈 문자열을 undefined로 변환

  email: z
    .string()
    .email('올바른 이메일 형식이 아닙니다')
    .optional()
    .or(z.literal(''))
    .transform(val => val === '' ? undefined : val), // 빈 문자열을 undefined로 변환

  phone: z
    .string()
    .min(10, '전화번호는 최소 10자리 이상이어야 합니다')
    .max(20, '전화번호는 최대 20자리까지 가능합니다')
    .optional()
    .or(z.literal(''))
    .transform(val => val === '' ? undefined : val), // 빈 문자열을 undefined로 변환

  password: z
    .string()
    .min(4, '비밀번호는 최소 4자 이상이어야 합니다')
    .max(100, '비밀번호는 최대 100자까지 가능합니다')
    .optional()
    .or(z.literal(''))
    .transform(val => val === '' ? undefined : val), // 빈 문자열 → undefined (전화번호 뒷자리 자동 등록)

  status: z.enum(['ACTIVE', 'INACTIVE', 'PENDING'], {
    errorMap: () => ({ message: '올바른 상태를 선택해주세요' }),
  }),

  roleIds: z
    .array(z.string())
    .min(1, '최소 1개 이상의 역할을 선택해주세요'),

  gender: z.enum(['MALE', 'FEMALE']).optional(), // 성별

  hasPaidDues: z.boolean().optional().default(false), // 회비 납부 여부
});

// 봉사자 수정 스키마 (비밀번호는 선택사항)
export const volunteerUpdateSchema = z.object({
  name: z
    .string()
    .min(2, '이름은 최소 2글자 이상이어야 합니다')
    .max(50, '이름은 최대 50글자까지 가능합니다'),

  baptismalName: z
    .string()
    .min(1, '세례명은 최소 1글자 이상이어야 합니다')
    .max(50, '세례명은 최대 50글자까지 가능합니다')
    .optional()
    .or(z.literal(''))
    .transform(val => val === '' ? undefined : val), // 빈 문자열을 undefined로 변환

  email: z
    .string()
    .email('올바른 이메일 형식이 아닙니다')
    .optional()
    .or(z.literal(''))
    .transform(val => val === '' ? undefined : val), // 빈 문자열을 undefined로 변환

  phone: z
    .string()
    .min(10, '전화번호는 최소 10자리 이상이어야 합니다')
    .max(20, '전화번호는 최대 20자리까지 가능합니다')
    .optional()
    .or(z.literal(''))
    .transform(val => val === '' ? undefined : val), // 빈 문자열을 undefined로 변환

  password: z
    .string()
    .min(4, '비밀번호는 최소 4자 이상이어야 합니다')
    .max(100, '비밀번호는 최대 100자까지 가능합니다')
    .optional()
    .or(z.literal('')),

  status: z.enum(['ACTIVE', 'INACTIVE', 'PENDING'], {
    errorMap: () => ({ message: '올바른 상태를 선택해주세요' }),
  }),

  roleIds: z
    .array(z.string())
    .min(1, '최소 1개 이상의 역할을 선택해주세요'),

  // 봉사자 추가 정보
  availableThisMonth: z.boolean().nullable().optional(), // null=미입력, true=가능, false=불가능

  preferredDays: z
    .array(z.number().min(0).max(6))
    .optional(),

  preferredTimes: z
    .array(z.string())
    .optional(), // 선호 시간대 ("상관없음","새벽","오전","오후","저녁")

  unavailableDays: z
    .array(z.number().min(0).max(6))
    .optional(),

  unavailableDates: z
    .array(z.string())
    .optional(),

  gender: z.enum(['MALE', 'FEMALE']).optional(), // 성별

  hasPaidDues: z.boolean().optional(), // 회비 납부 여부
});

// TypeScript 타입 추출
export type VolunteerCreateInput = z.infer<typeof volunteerCreateSchema>;
export type VolunteerUpdateInput = z.infer<typeof volunteerUpdateSchema>;
