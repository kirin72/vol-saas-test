/**
 * 성당 디렉토리 유틸리티
 * 한글 미사시간 문자열 파싱 + MassTemplate 생성 데이터 변환
 */

import { MassType } from '@prisma/client';

// 파싱된 미사시간 하나의 구조
export interface ParsedMassTime {
  time: string; // "HH:mm" 형식 (예: "10:00", "18:00")
  label: string; // 원본 텍스트 (예: "오전 10시")
}

// MassTemplate 생성에 필요한 데이터 구조
export interface TemplateCreateData {
  name: string; // 템플릿 이름 (예: "주일 오전 10시 미사")
  massType: MassType; // SUNDAY, WEEKDAY, SATURDAY
  dayOfWeek: string[]; // 반복 요일 배열
  time: string; // "HH:mm" 형식
}

// 기본 봉사 역할 9개 정의
export const DEFAULT_VOLUNTEER_ROLES = [
  { name: '1독서', description: '제1독서 봉독', color: '#3B82F6', sortOrder: 1 },
  { name: '2독서', description: '제2독서 봉독', color: '#60A5FA', sortOrder: 2 },
  { name: '해설', description: '미사 해설', color: '#10B981', sortOrder: 3 },
  { name: '반주', description: '반주 봉사', color: '#8B5CF6', sortOrder: 4 },
  { name: '복사', description: '복사 봉사', color: '#F59E0B', sortOrder: 5 },
  { name: '제대', description: '제대 봉사', color: '#EF4444', sortOrder: 6 },
  { name: '성체분배', description: '성체분배 봉사', color: '#EC4899', sortOrder: 7 },
  { name: '주차', description: '주차 안내 봉사', color: '#6B7280', sortOrder: 8 },
  { name: '운전', description: '차량 운전 봉사', color: '#14B8A6', sortOrder: 9 },
] as const;

/**
 * 한글 시간 문자열에서 개별 시간을 추출하여 HH:mm 형식으로 변환
 * 지원 형식:
 *   - "오전 10시" → "10:00"
 *   - "오후 6시" → "18:00"
 *   - "오전 6시 30분" → "06:30"
 *   - "오후 12시" → "12:00"
 *   - "10:00" → "10:00" (이미 HH:mm 형식)
 *   - "새벽 5시" → "05:00"
 */
export function parseMassTimes(massTimeStr: string): ParsedMassTime[] {
  // null/빈 문자열 처리
  if (!massTimeStr || massTimeStr.trim() === '') return [];

  const results: ParsedMassTime[] = [];

  // 줄바꿈으로 분리 (여러 줄의 미사시간 정보 - 예: "주일: 오전 10시\n토요: 오후 6시")
  const lines = massTimeStr.split('\n');

  for (const line of lines) {
    // 각 줄에서 시간 부분만 추출 (콜론 뒤 부분)
    const timePart = line.includes(':') && !line.match(/^\d{1,2}:\d{2}/)
      ? line.split(':').slice(1).join(':') // "주일: 오전10시" → "오전10시"
      : line;

    // 쉼표나 슬래시로 구분된 다중 시간 처리
    const timeSegments = timePart.split(/[,/]/).map(s => s.trim()).filter(Boolean);

    for (const segment of timeSegments) {
      const parsed = parseKoreanTime(segment);
      if (parsed) {
        // 중복 시간 제거
        if (!results.some(r => r.time === parsed.time)) {
          results.push(parsed);
        }
      }
    }
  }

  return results;
}

/**
 * 단일 한글 시간 문자열을 파싱
 * 예: "오전 10시" → { time: "10:00", label: "오전 10시" }
 *     "오후 6시 30분" → { time: "18:30", label: "오후 6시 30분" }
 *     "10:00" → { time: "10:00", label: "10:00" }
 */
function parseKoreanTime(str: string): ParsedMassTime | null {
  const trimmed = str.trim();
  if (!trimmed) return null;

  // 이미 HH:mm 형식인 경우 (예: "10:00", "06:30")
  const hhmmMatch = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (hhmmMatch) {
    const h = parseInt(hhmmMatch[1]);
    const m = parseInt(hhmmMatch[2]);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return {
        time: `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`,
        label: trimmed,
      };
    }
  }

  // 한글 시간 형식: (오전|오후|새벽|저녁|밤) X시 (Y분)
  const koreanMatch = trimmed.match(
    /(오전|오후|새벽|저녁|밤|낮)?\s*(\d{1,2})\s*시\s*(?:(\d{1,2})\s*분)?/
  );

  if (koreanMatch) {
    const period = koreanMatch[1] || ''; // 오전/오후/새벽 등
    let hour = parseInt(koreanMatch[2]); // 시
    const minute = koreanMatch[3] ? parseInt(koreanMatch[3]) : 0; // 분

    // 오후/저녁/밤: 12시간제 → 24시간제 변환
    if (['오후', '저녁', '밤'].includes(period)) {
      if (hour < 12) hour += 12; // 오후 1시→13, 오후 6시→18
    }
    // 새벽: 그대로 (새벽 5시 = 05:00)
    // 오전: 그대로 (오전 10시 = 10:00)
    // period 없는 경우: 12시간제 기준으로 판단 (7~11 → 오전, 그 외 → 그대로)

    // 유효 범위 검사
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      return {
        time: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
        label: trimmed,
      };
    }
  }

  // 파싱 불가 → null 반환 (에러 없이 스킵)
  return null;
}

// 한글 요일 약어 → 영문 요일 이름 매핑
const koreanDayToEnglish: Record<string, string> = {
  '월': 'MONDAY',
  '화': 'TUESDAY',
  '수': 'WEDNESDAY',
  '목': 'THURSDAY',
  '금': 'FRIDAY',
  '토': 'SATURDAY',
  '일': 'SUNDAY',
};

// 영문 요일 이름 → 한글 약어 (템플릿 이름용)
const englishDayToKorean: Record<string, string> = {
  MONDAY: '월',
  TUESDAY: '화',
  WEDNESDAY: '수',
  THURSDAY: '목',
  FRIDAY: '금',
  SATURDAY: '토',
  SUNDAY: '일',
};

/**
 * 요일별 미사시간 상세 파싱
 * "월: 06:00(설명)\n화: 10:00(설명) 19:00(설명)" 형식 지원
 * 반환: Map<time(HH:mm), dayOfWeek[]> — 같은 시간대의 요일을 그룹핑
 */
function parseWeekdayMassDetailed(weekdayMass: string): Map<string, string[]> {
  const timeToDays = new Map<string, string[]>();
  const lines = weekdayMass.split('\n');

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    // 줄 시작에서 요일 약어 추출 (예: "월:", "화:", "토:")
    const dayMatch = trimmedLine.match(/^([월화수목금토일])\s*[:：]/);
    if (!dayMatch) continue;

    const koreanDay = dayMatch[1];
    const dayOfWeek = koreanDayToEnglish[koreanDay];
    if (!dayOfWeek) continue;

    // 요일 접두사 이후의 시간 부분 추출
    const timePart = trimmedLine.substring(dayMatch[0].length);
    // HH:mm 형식의 시간을 모두 추출 (괄호 안의 설명 텍스트는 무시)
    // bare number(예: "17")도 HH:00으로 처리
    const timeMatches = [...timePart.matchAll(/(\d{1,2}):(\d{2})/g)];

    // HH:mm 매칭이 없으면 bare number(시간만) 시도
    if (timeMatches.length === 0) {
      const bareMatches = [...timePart.matchAll(/(\d{1,2})(?=\s|,|$)/g)];
      for (const bm of bareMatches) {
        const h = parseInt(bm[1]);
        if (h >= 0 && h <= 23) {
          timeMatches.push(Object.assign([bm[0], bm[1], '00'], { index: bm.index, input: bm.input }) as any);
        }
      }
    }

    for (const match of timeMatches) {
      const h = parseInt(match[1]);
      const m = parseInt(match[2]);
      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
        const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        if (!timeToDays.has(time)) {
          timeToDays.set(time, []);
        }
        // 중복 요일 방지
        if (!timeToDays.get(time)!.includes(dayOfWeek)) {
          timeToDays.get(time)!.push(dayOfWeek);
        }
      }
    }
  }

  return timeToDays;
}

/**
 * 요일별 상세 파싱 결과를 템플릿 데이터로 변환하는 헬퍼
 * timeToDays Map에서 요일별 적절한 MassType을 결정하여 템플릿 배열 생성
 * - SUNDAY → 주일미사
 * - SATURDAY → 토요미사
 * - MONDAY~FRIDAY → 평일미사 (같은 시간대 요일 그룹핑)
 */
function convertTimeToDaysToTemplates(
  timeToDays: Map<string, string[]>,
): TemplateCreateData[] {
  const templates: TemplateCreateData[] = [];

  for (const [time, days] of timeToDays) {
    // 주일(일요일) 분리
    const hasSunday = days.includes('SUNDAY');
    // 토요일 분리
    const hasSaturday = days.includes('SATURDAY');
    // 평일 (월~금)
    const weekdays = days.filter((d) => d !== 'SATURDAY' && d !== 'SUNDAY');

    // 주일 템플릿 생성
    if (hasSunday) {
      templates.push({
        name: `주일 ${time} 미사`,
        massType: 'SUNDAY' as MassType,
        dayOfWeek: ['SUNDAY'],
        time,
      });
    }

    // 토요일 별도 템플릿 생성
    if (hasSaturday) {
      templates.push({
        name: `토요 ${time} 미사`,
        massType: 'SATURDAY' as MassType,
        dayOfWeek: ['SATURDAY'],
        time,
      });
    }

    // 평일 템플릿 생성 (월~금 중 해당 요일만)
    if (weekdays.length > 0) {
      // 요일 라벨 생성 (예: "월,수,금" 또는 전체면 생략)
      const allWeekdays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
      const isAllWeekdays = allWeekdays.every((d) => weekdays.includes(d));
      const dayLabel = isAllWeekdays
        ? '' // 전체 평일이면 라벨 생략
        : ` (${weekdays.map((d) => englishDayToKorean[d]).join(',')})`;

      templates.push({
        name: `평일 ${time} 미사${dayLabel}`,
        massType: 'WEEKDAY' as MassType,
        dayOfWeek: weekdays,
        time,
      });
    }
  }

  return templates;
}

/**
 * 파싱된 미사시간 → MassTemplate 생성 데이터로 변환
 *
 * 주일미사 (sundayMass):
 *   "토: 18:00(특전)\n일: 07:00(새벽) 11:00(교중) 18:00(청년)" 형식
 *   → 토요 18:00 미사 (SATURDAY), 주일 07:00/11:00/18:00 미사 (SUNDAY) 각각 생성
 *
 * 평일미사 (weekdayMass):
 *   "월: 06:00(새벽)\n화: 10:00(오전) 19:00(저녁)" 형식
 *   → 같은 시간대의 요일을 그룹핑하여 템플릿 생성
 *   예: 월,수,금 06:00 / 화,목 10:00 → 별도 템플릿
 */
export function buildTemplateData(
  sundayMass: string | null,
  weekdayMass: string | null,
  orgName: string,
): TemplateCreateData[] {
  const templates: TemplateCreateData[] = [];

  // 주일미사 파싱 (토요 특전미사 포함)
  if (sundayMass) {
    // 요일 접두사 형식인지 확인 (토:, 일: 등)
    const hasDayPrefix = /^[월화수목금토일]\s*[:：]/m.test(sundayMass);

    if (hasDayPrefix) {
      // 요일별 상세 파싱 → 시간별 요일 그룹핑 → 템플릿 변환
      const timeToDays = parseWeekdayMassDetailed(sundayMass);
      templates.push(...convertTimeToDaysToTemplates(timeToDays));
    } else {
      // 폴백: 단순 시간 나열 (비구조화 데이터)
      const sundayTimes = parseMassTimes(sundayMass);
      for (const t of sundayTimes) {
        templates.push({
          name: `주일 ${t.label || t.time} 미사`,
          massType: 'SUNDAY' as MassType,
          dayOfWeek: ['SUNDAY'],
          time: t.time,
        });
      }
    }
  }

  // 평일미사 파싱 (요일별 상세 구분)
  if (weekdayMass) {
    // 요일 접두사 형식인지 확인 (월:, 화: 등)
    const hasDayPrefix = /^[월화수목금토일]\s*[:：]/m.test(weekdayMass);

    if (hasDayPrefix) {
      // 요일별 상세 파싱 → 시간별 요일 그룹핑 → 템플릿 변환
      const timeToDays = parseWeekdayMassDetailed(weekdayMass);
      templates.push(...convertTimeToDaysToTemplates(timeToDays));
    } else {
      // 폴백: 단순 시간 나열 → 전체 평일 적용
      const weekdayTimes = parseMassTimes(weekdayMass);
      for (const t of weekdayTimes) {
        templates.push({
          name: `평일 ${t.label || t.time} 미사`,
          massType: 'WEEKDAY' as MassType,
          dayOfWeek: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
          time: t.time,
        });
      }
    }
  }

  return templates;
}

/**
 * 특정 월에서 특정 요일에 해당하는 모든 날짜를 반환
 * (generate-schedules/route.ts의 로직 재사용)
 */
export function getDatesForDayOfWeek(year: number, month: number, dayOfWeek: number): Date[] {
  const dates: Date[] = [];
  // 해당 월의 첫째 날
  const firstDay = new Date(year, month - 1, 1);
  // 해당 월의 마지막 날
  const lastDay = new Date(year, month, 0);

  // 첫 번째 해당 요일 찾기
  const current = new Date(firstDay);
  const diff = (dayOfWeek - current.getDay() + 7) % 7;
  current.setDate(current.getDate() + diff);

  // 해당 월 내의 모든 해당 요일 수집
  while (current <= lastDay) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 7);
  }

  return dates;
}

// 요일 문자열 → Date.getDay() 숫자 변환
export const dayOfWeekToNumber: Record<string, number> = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
};
