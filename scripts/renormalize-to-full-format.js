/**
 * 미사시간 재정규화 스크립트
 * 모든 형식 → "요일 HH:mm" (한 줄에 하나씩) 통일
 *
 * 목표 형식:
 *   주일: "토요일 16:00\n토요일 18:00\n일요일 09:00\n일요일 11:00"
 *   평일: "월요일 06:00\n화요일 06:00\n화요일 10:00\n수요일 06:00"
 *
 * 입력 형식 처리:
 *   1. 요일접두사: "토: 16:00, 18:00\n일: 09:00, 11:00"
 *   2. 플랫:       "06:30, 09:00, 11:00"
 *   3. 서울 괄호:  "토: 16:00(설명)18:00(설명)"
 */
const fs = require('fs');
const path = require('path');

// 요일 약어 → 풀네임
const DAY_FULL = {
  '월': '월요일', '화': '화요일', '수': '수요일',
  '목': '목요일', '금': '금요일', '토': '토요일', '일': '일요일',
};

// 정렬용 요일 순서
const DAY_ORDER = ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일'];

// 텍스트에서 HH:mm 패턴을 모두 추출
function extractTimes(text) {
  const results = [];
  // 연결된 시간 분리: "16:00(설명)18:00(설명)" → "16:00 18:00"
  const expanded = text
    .replace(/\([^)]*\)/g, ' ') // 괄호 안 설명 제거
    .replace(/(\d{2}:\d{2})(?=\d{2}:\d{2})/g, '$1 '); // 붙은 시간 분리
  const matches = [...expanded.matchAll(/(\d{1,2}):(\d{2})/g)];
  for (const m of matches) {
    const h = parseInt(m[1]), min = parseInt(m[2]);
    if (h >= 0 && h <= 23 && min >= 0 && min <= 59) {
      const time = h.toString().padStart(2, '0') + ':' + min.toString().padStart(2, '0');
      if (!results.includes(time)) results.push(time);
    }
  }
  return results;
}

/**
 * 미사시간 텍스트 → "요일 HH:mm" 라인 배열로 변환
 * @param {string} text - 현재 미사시간 텍스트
 * @param {'sunday'|'weekday'} type - 주일/평일 구분
 * @returns {string} - 정규화된 텍스트 ("요일 HH:mm\n요일 HH:mm\n...")
 */
function convertToFullFormat(text, type) {
  if (!text || !text.trim()) return '';

  const entries = []; // { day: '월요일', time: '06:00' }

  // 요일 접두사 형식 확인: "토:", "월:", "일:" 등으로 시작하는 줄이 있는지
  const hasDayPrefix = /^[월화수목금토일]\s*[:：]/m.test(text);

  if (hasDayPrefix) {
    // ─── 요일 접두사 형식 ───
    // "토: 16:00, 18:00\n일: 09:00, 11:00"
    // "토: 16:00(설명)18:00(설명)"
    const lines = text.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const dayMatch = trimmed.match(/^([월화수목금토일])\s*[:：]\s*/);
      if (!dayMatch) continue;

      const dayFull = DAY_FULL[dayMatch[1]];
      const timePart = trimmed.substring(dayMatch[0].length);
      const times = extractTimes(timePart);

      for (const t of times) {
        entries.push({ day: dayFull, time: t });
      }
    }
  } else {
    // ─── 플랫 형식 ───
    // "06:30, 09:00, 11:00"
    const times = extractTimes(text);

    if (type === 'sunday') {
      // 주일미사 플랫: 모두 일요일로 처리
      for (const t of times) {
        entries.push({ day: '일요일', time: t });
      }
    } else {
      // 평일미사 플랫: 월~금 전체에 동일 시간 적용
      const weekdays = ['월요일', '화요일', '수요일', '목요일', '금요일'];
      for (const day of weekdays) {
        for (const t of times) {
          entries.push({ day, time: t });
        }
      }
    }
  }

  // 정렬: 요일 순서 → 시간 순서
  entries.sort((a, b) => {
    const dayDiff = DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day);
    if (dayDiff !== 0) return dayDiff;
    return a.time.localeCompare(b.time);
  });

  // "요일 HH:mm" 포맷으로 출력
  return entries.map(e => `${e.day} ${e.time}`).join('\n');
}

// ─── 메인 ───

const jsonPath = path.join(__dirname, '..', 'prisma', 'seed-data', 'church-directory.json');
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

let changed = 0;
const stats = {};

for (const church of data) {
  const origS = church.sundayMass;
  const origW = church.weekdayMass;

  // 주일미사 변환
  if (church.sundayMass) {
    church.sundayMass = convertToFullFormat(church.sundayMass, 'sunday');
  }

  // 평일미사 변환
  if (church.weekdayMass) {
    church.weekdayMass = convertToFullFormat(church.weekdayMass, 'weekday');
  }

  if (church.sundayMass !== origS || church.weekdayMass !== origW) {
    changed++;
    if (!stats[church.diocese]) stats[church.diocese] = 0;
    stats[church.diocese]++;
  }
}

// 저장
fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf-8');

console.log('\n=== 재정규화 완료 ===');
console.log(`  변경: ${changed}개 성당`);
for (const [d, c] of Object.entries(stats)) {
  console.log(`  ${d}: ${c}개`);
}

// 샘플 출력
console.log('\n=== 변환 샘플 ===');
const sampleDioceses = ['서울대교구', '대전교구', '제주교구', '인천대교구', '춘천교구'];
for (const d of sampleDioceses) {
  const items = data.filter(c => c.diocese === d && c.sundayMass);
  if (items.length === 0) continue;
  const c = items[0];
  console.log(`\n[${d}] ${c.name}`);
  console.log('  주일:');
  (c.sundayMass || '').split('\n').forEach(l => console.log('    ' + l));
  console.log('  평일:');
  (c.weekdayMass || '').split('\n').slice(0, 6).forEach(l => console.log('    ' + l));
  const wLines = (c.weekdayMass || '').split('\n');
  if (wLines.length > 6) console.log('    ... 외 ' + (wLines.length - 6) + '줄');
}

// 통계
const withMass = data.filter(c => c.sundayMass || c.weekdayMass);
const sundayLines = withMass.reduce((sum, c) => sum + (c.sundayMass ? c.sundayMass.split('\n').length : 0), 0);
const weekdayLines = withMass.reduce((sum, c) => sum + (c.weekdayMass ? c.weekdayMass.split('\n').length : 0), 0);
console.log(`\n=== 통계 ===`);
console.log(`  주일 미사시간 총 ${sundayLines}줄 (성당당 평균 ${(sundayLines / withMass.filter(c => c.sundayMass).length).toFixed(1)}개)`);
console.log(`  평일 미사시간 총 ${weekdayLines}줄 (성당당 평균 ${(weekdayLines / withMass.filter(c => c.weekdayMass).length).toFixed(1)}개)`);
