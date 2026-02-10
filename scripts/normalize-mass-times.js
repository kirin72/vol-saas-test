/**
 * 미사시간 데이터 정규화 스크립트
 * 교구별 비정형 포맷 → 일관된 "요일: HH:mm, HH:mm" 형식으로 변환
 *
 * 표준 출력 형식:
 *   주일: "토: 16:00, 19:00\n일: 08:00, 10:30"
 *   평일: "월: 07:00\n화: 19:30\n수: 10:00"
 *   또는 요일 구분 불가 시: "06:30, 10:00"
 */
const fs = require('fs');
const path = require('path');

// ─── 유틸리티 ───

// 숫자만(시간)→ HH:mm 변환 (8→"08:00", 10:30→"10:30", 19→"19:00")
// 한글 "시/분" 형식도 지원 (06시→"06:00", 9시30분→"09:30", 오전6시→"06:00")
function toHHmm(raw) {
  const s = raw.trim();
  // 이미 HH:mm 형태
  const m = s.match(/^(\d{1,2}):(\d{2})$/);
  if (m) {
    const h = parseInt(m[1]), min = parseInt(m[2]);
    if (h >= 0 && h <= 23 && min >= 0 && min <= 59)
      return h.toString().padStart(2, '0') + ':' + min.toString().padStart(2, '0');
  }
  // 숫자만 (시간만, 분 없음)
  const n = s.match(/^(\d{1,2})$/);
  if (n) {
    const h = parseInt(n[1]);
    if (h >= 0 && h <= 23) return h.toString().padStart(2, '0') + ':00';
  }
  // 한글 "시/분" 형식: "06시", "9시30분", "오전6시", "오후 7시 30분"
  const korean = s.match(/(오전|오후|새벽|저녁|밤)?\s*(\d{1,2})\s*시\s*(?:(\d{1,2})\s*분)?/);
  if (korean) {
    const period = korean[1] || '';
    let h = parseInt(korean[2]);
    const min = korean[3] ? parseInt(korean[3]) : 0;
    // 오후/저녁/밤 → 24시간제 변환
    if (['오후', '저녁', '밤'].includes(period) && h < 12) h += 12;
    if (h >= 0 && h <= 23 && min >= 0 && min <= 59)
      return h.toString().padStart(2, '0') + ':' + min.toString().padStart(2, '0');
  }
  return null;
}

// 문자열에서 HH:mm 패턴을 모두 추출
function extractAllTimes(text) {
  const results = [];
  // 연결된 시간 분리: "06:0008:3010:30" → ["06:00", "08:30", "10:30"]
  const expanded = text.replace(/(\d{2}:\d{2})(?=\d{2}:\d{2})/g, '$1 ');
  const matches = [...expanded.matchAll(/(\d{1,2}):(\d{2})/g)];
  for (const m of matches) {
    const h = parseInt(m[1]), min = parseInt(m[2]);
    if (h >= 0 && h <= 23 && min >= 0 && min <= 59) {
      results.push(h.toString().padStart(2, '0') + ':' + min.toString().padStart(2, '0'));
    }
  }
  return [...new Set(results)];
}

// 오후/오전 변환: 오후 7:00 → 19:00
function applyPeriod(timeStr, period) {
  const m = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return timeStr;
  let h = parseInt(m[1]);
  const min = m[2];
  if (period === '오후' || period === '저녁' || period === '밤') {
    if (h < 12) h += 12;
  }
  return h.toString().padStart(2, '0') + ':' + min;
}

// ─── 대전교구 정규화 ───

function normalizeDaejeon(sundayMass, weekdayMass) {
  // 주일: "8/10:30 / 토: 16/19" 또는 "10/19 / 토: 19"
  // 변형: "10:30(교중), 17 / 토: 18:00(주일학교)", "토: 17", "오전 11,"
  let normalizedSunday = sundayMass;
  if (sundayMass) {
    // "/ 토:" 또는 "토:" 로 분리
    const satSplit = sundayMass.split(/[\/,]\s*토\s*:\s*/);
    const sundayPart = satSplit[0].trim();
    const satPart = satSplit.length > 1 ? satSplit[1].trim() : '';

    // "토:" 로 시작하는 경우 sundayPart가 비어있을 수 있음
    const isSatOnly = /^\s*토\s*:/.test(sundayMass);

    // 시간 추출: HH:mm 또는 숫자만 → toHHmm 변환
    function extractTimesFromPart(part) {
      const times = [];
      // 괄호 안의 설명 제거
      const cleaned = part.replace(/\([^)]*\)/g, '');
      // 쉼표, 슬래시, 공백으로 분리
      const tokens = cleaned.split(/[,/\s]+/).map(s => s.trim()).filter(Boolean);
      for (const t of tokens) {
        const hhmm = toHHmm(t);
        if (hhmm && !times.includes(hhmm)) times.push(hhmm);
      }
      return times;
    }

    // isSatOnly일 때: "토:" 이후 전체가 토요 시간
    const sundayTimes = isSatOnly ? [] : extractTimesFromPart(sundayPart);
    const satTimeSrc = isSatOnly
      ? sundayMass.replace(/^\s*토\s*:\s*/, '') // "토: 17" → "17"
      : satPart;
    const satTimes = satTimeSrc ? extractTimesFromPart(satTimeSrc) : [];

    const parts = [];
    if (satTimes.length > 0) parts.push('토: ' + satTimes.join(', '));
    if (sundayTimes.length > 0) parts.push('일: ' + sundayTimes.join(', '));
    normalizedSunday = parts.join('\n') || sundayMass;
  }

  // 평일: "월/7, 화/19:30, 수/10, 목/19:30, 금/10"
  // 변형: "월 06:30(동9)/ 화 19:30(동19)/ 수 10/ 목 (첫목,성시간) 19:30(동19) / 금 10"
  let normalizedWeekday = weekdayMass;
  if (weekdayMass) {
    const dayMap = {};
    // 패턴1: "요일/시간" (슬래시 구분)
    const pattern1 = /([월화수목금토])\s*\/\s*([\d:]+)/g;
    let match;
    while ((match = pattern1.exec(weekdayMass)) !== null) {
      const day = match[1];
      const time = toHHmm(match[2]);
      if (time) {
        if (!dayMap[day]) dayMap[day] = [];
        if (!dayMap[day].includes(time)) dayMap[day].push(time);
      }
    }
    // 패턴2: "요일 시간" (공백 구분) — 패턴1 매칭 실패 시
    if (Object.keys(dayMap).length === 0) {
      const pattern2 = /([월화수목금토])\s+(?:\([^)]*\)\s*)?(\d{1,2}(?::\d{2})?)/g;
      while ((match = pattern2.exec(weekdayMass)) !== null) {
        const day = match[1];
        const time = toHHmm(match[2]);
        if (time) {
          if (!dayMap[day]) dayMap[day] = [];
          if (!dayMap[day].includes(time)) dayMap[day].push(time);
        }
      }
    }
    if (Object.keys(dayMap).length > 0) {
      const dayOrder = ['월', '화', '수', '목', '금', '토'];
      normalizedWeekday = dayOrder
        .filter(d => dayMap[d])
        .map(d => d + ': ' + dayMap[d].join(', '))
        .join('\n');
    }
  }

  return { sundayMass: normalizedSunday, weekdayMass: normalizedWeekday };
}

// ─── 제주교구 정규화 ───
// "06:30 09:00 11:00 교중 15:00 어린이 18:00 청년, 학생 21:00 자비의 경당"
// → "06:30, 09:00, 11:00, 15:00, 18:00, 21:00"

function normalizeJeju(sundayMass, weekdayMass) {
  let normalizedSunday = sundayMass;
  if (sundayMass) {
    const times = extractAllTimes(sundayMass);
    if (times.length > 0) normalizedSunday = times.join(', ');
  }

  // 평일: "06:30 10:00 (월)" → "(월)"은 미사 없는 요일 표시, 시간만 추출
  let normalizedWeekday = weekdayMass;
  if (weekdayMass) {
    const times = extractAllTimes(weekdayMass);
    if (times.length > 0) normalizedWeekday = times.join(', ');
  }

  return { sundayMass: normalizedSunday, weekdayMass: normalizedWeekday };
}

// ─── 원주교구 정규화 ───
// "토 18:30(초.중고등) 일 06:0008:3010:30(교중)19:30(청년)"
// → "토: 18:30\n일: 06:00, 08:30, 10:30, 19:30"

function normalizeWonju(sundayMass, weekdayMass) {
  let normalizedSunday = sundayMass;
  if (sundayMass) {
    // "토" 와 "일" 마커로 분리
    const parts = [];

    // 토요일 부분 추출
    const satMatch = sundayMass.match(/토\s+([\s\S]*?)(?=\s*일\s|$)/);
    if (satMatch) {
      const satTimes = extractAllTimes(satMatch[1]);
      if (satTimes.length > 0) parts.push('토: ' + satTimes.join(', '));
    }

    // 일요일 부분 추출
    const sunMatch = sundayMass.match(/일\s+([\s\S]*?)$/);
    if (sunMatch) {
      const sunTimes = extractAllTimes(sunMatch[1]);
      if (sunTimes.length > 0) parts.push('일: ' + sunTimes.join(', '));
    }

    if (parts.length > 0) normalizedSunday = parts.join('\n');
  }

  // 평일: "06:00 (월)" → 시간만 추출, "- (월)" → 미사 없음
  let normalizedWeekday = weekdayMass;
  if (weekdayMass) {
    // "- (월)" 형태 → 평일미사 없음
    if (/^\s*-\s*\(/.test(weekdayMass)) {
      normalizedWeekday = '';
    } else {
      const times = extractAllTimes(weekdayMass);
      if (times.length > 0) normalizedWeekday = times.join(', ');
    }
  }

  return { sundayMass: normalizedSunday, weekdayMass: normalizedWeekday };
}

// ─── 대구대교구 정규화 ───
// sundayMass: "토요일 - 오후 7:00(동) 7:30(하) 주일 - 오전 7:00 10:00(교중)"
// weekdayMass: "오전 수,금 6:30 오후 화,목 7:00(동) 7:30(하)"

function normalizeDaegu(sundayMass, weekdayMass) {
  let normalizedSunday = sundayMass;
  if (sundayMass) {
    const parts = [];

    // "토요일 - 오전/오후 시간들" 파싱
    const satMatch = sundayMass.match(/토요일\s*[-–]\s*([\s\S]*?)(?=주일|$)/);
    if (satMatch) {
      const satTimes = parsePeriodTimes(satMatch[1]);
      if (satTimes.length > 0) parts.push('토: ' + satTimes.join(', '));
    }

    // "주일 - 오전/오후 시간들" 파싱
    const sunMatch = sundayMass.match(/주일\s*[-–]\s*([\s\S]*?)$/);
    if (sunMatch) {
      const sunTimes = parsePeriodTimes(sunMatch[1]);
      if (sunTimes.length > 0) parts.push('일: ' + sunTimes.join(', '));
    }

    // 토요일/주일 마커 없는 경우 → 전체에서 시간 추출
    if (parts.length === 0) {
      const allTimes = parsePeriodTimes(sundayMass);
      if (allTimes.length > 0) normalizedSunday = allTimes.join(', ');
    } else {
      normalizedSunday = parts.join('\n');
    }
  }

  // 평일: "오전 수,금 6:30 오후 화,목 7:00(동) 7:30(하)"
  let normalizedWeekday = weekdayMass;
  if (weekdayMass) {
    normalizedWeekday = parseDaeguWeekday(weekdayMass);
  }

  return { sundayMass: normalizedSunday, weekdayMass: normalizedWeekday };
}

// 오전/오후 + 시간들 파싱: "오후 7:00(동) 7:30(하) 오전 10:00" → ["19:00","19:30","10:00"]
function parsePeriodTimes(text) {
  const results = [];
  // 오전/오후 마커로 분할
  const segments = text.split(/(오전|오후|새벽|저녁)/);
  let currentPeriod = '';

  for (const seg of segments) {
    const trimmed = seg.trim();
    if (['오전', '오후', '새벽', '저녁'].includes(trimmed)) {
      currentPeriod = trimmed;
      continue;
    }
    // 이 세그먼트에서 시간 추출
    const rawTimes = extractAllTimes(trimmed);
    for (const t of rawTimes) {
      const converted = applyPeriod(t, currentPeriod);
      if (!results.includes(converted)) results.push(converted);
    }
  }
  return results;
}

// 대구대교구 평일 전용: "오전 수,금 6:30 오후 화,목 7:00(동) 7:30(하)"
function parseDaeguWeekday(text) {
  const dayMap = {}; // 요일 → 시간 배열

  // 패턴: "오전/오후 요일목록 시간들" 반복
  // "오전 월 6:30 수,금 10:00 오후 화,목 7:30"
  const segments = text.split(/(오전|오후|새벽|저녁)/);
  let currentPeriod = '';

  for (const seg of segments) {
    const trimmed = seg.trim();
    if (['오전', '오후', '새벽', '저녁'].includes(trimmed)) {
      currentPeriod = trimmed;
      continue;
    }
    if (!trimmed) continue;

    // "수,금 6:30" 또는 "월 6:30 수,금 10:00" 패턴 파싱
    // 요일+시간 쌍을 반복 추출
    const pattern = /([월화수목금토일](?:\s*,\s*[월화수목금토일])*)\s+([\d:.\s()가-힣]+?)(?=\s*[월화수목금토일](?:\s*,|\s+\d)|$)/g;
    let match;
    while ((match = pattern.exec(trimmed)) !== null) {
      const days = match[1].split(/\s*,\s*/);
      const timePart = match[2];
      const times = extractAllTimes(timePart);
      for (const day of days) {
        const d = day.trim();
        if (!dayMap[d]) dayMap[d] = [];
        for (const t of times) {
          const converted = applyPeriod(t, currentPeriod);
          if (!dayMap[d].includes(converted)) dayMap[d].push(converted);
        }
      }
    }
  }

  if (Object.keys(dayMap).length > 0) {
    const dayOrder = ['월', '화', '수', '목', '금', '토'];
    return dayOrder
      .filter(d => dayMap[d] && dayMap[d].length > 0)
      .map(d => d + ': ' + dayMap[d].join(', '))
      .join('\n');
  }

  // 파싱 실패 시 단순 시간 추출
  const times = extractAllTimes(text);
  return times.length > 0 ? times.join(', ') : text;
}

// ─── 춘천교구 평일 정규화 ───
// "09:00 (월)" → "09:00" (공백 구분 시간 + 괄호 주석)

function normalizeChuncheonWeekday(weekdayMass) {
  if (!weekdayMass) return weekdayMass;
  const times = extractAllTimes(weekdayMass);
  return times.length > 0 ? times.join(', ') : weekdayMass;
}

// ─── 범용: 이미 정규화된 형식인지 확인 ───

function isAlreadyNormalized(text) {
  if (!text) return true;
  // "요일: HH:mm" 형식이면 정규화 완료
  if (/^[월화수목금토일]\s*:/.test(text)) return true;
  // "HH:mm, HH:mm" 형식이면 정규화 완료
  if (/^\d{2}:\d{2}(,\s*\d{2}:\d{2})*$/.test(text.trim())) return true;
  return false;
}

// ─── 메인 실행 ───

const jsonPath = path.join(__dirname, '..', 'prisma', 'seed-data', 'church-directory.json');
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

let changed = 0;
const stats = {};

for (const church of data) {
  if (!church.sundayMass && !church.weekdayMass) continue;
  const orig = { s: church.sundayMass, w: church.weekdayMass };

  // 교구별 정규화 적용
  switch (church.diocese) {
    case '대전교구': {
      const n = normalizeDaejeon(church.sundayMass, church.weekdayMass);
      church.sundayMass = n.sundayMass;
      church.weekdayMass = n.weekdayMass;
      break;
    }
    case '제주교구': {
      const n = normalizeJeju(church.sundayMass, church.weekdayMass);
      church.sundayMass = n.sundayMass;
      church.weekdayMass = n.weekdayMass;
      break;
    }
    case '원주교구': {
      const n = normalizeWonju(church.sundayMass, church.weekdayMass);
      church.sundayMass = n.sundayMass;
      church.weekdayMass = n.weekdayMass;
      break;
    }
    case '대구대교구': {
      const n = normalizeDaegu(church.sundayMass, church.weekdayMass);
      church.sundayMass = n.sundayMass;
      church.weekdayMass = n.weekdayMass;
      break;
    }
    case '춘천교구': {
      // 주일은 이미 OK, 평일만 정규화
      church.weekdayMass = normalizeChuncheonWeekday(church.weekdayMass);
      break;
    }
    // 서울, 광주, 수원, 안동, 청주 — 이미 정상 형식
  }

  if (church.sundayMass !== orig.s || church.weekdayMass !== orig.w) {
    changed++;
    if (!stats[church.diocese]) stats[church.diocese] = 0;
    stats[church.diocese]++;
  }
}

// 결과 저장
fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf-8');

console.log(`\n=== 정규화 완료 ===`);
console.log(`  변경: ${changed}개 성당`);
for (const [d, c] of Object.entries(stats)) {
  console.log(`  ${d}: ${c}개`);
}

// 변환 결과 샘플 출력
console.log('\n=== 변환 샘플 ===');
const sampleDioceses = ['대전교구', '제주교구', '원주교구', '대구대교구', '춘천교구'];
for (const d of sampleDioceses) {
  const items = data.filter(c => c.diocese === d && c.sundayMass);
  if (items.length === 0) continue;
  console.log(`\n[${d}]`);
  items.slice(0, 2).forEach(c => {
    console.log(`  ${c.name}:`);
    console.log(`    주일: ${(c.sundayMass || '').substring(0, 100)}`);
    console.log(`    평일: ${(c.weekdayMass || '').substring(0, 100)}`);
  });
}
