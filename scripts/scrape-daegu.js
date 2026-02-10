/**
 * 대구대교구 성당 미사시간 재스크래핑 + 정규화
 * https://www.daegu-archdiocese.or.kr/page/area.html?srl=church_search&menu=
 *
 * 미사시간 포맷 규칙:
 *   [주일미사]
 *   토요일 - 오후 7:00(동) 7:30(하)     → 토요일 19:00 (동절기만 사용, 하절기 무시)
 *   주일 - 오전 7:00 10:00(교중)         → 일요일 07:00, 일요일 10:00
 *
 *   [평일미사]
 *   오전 월-금 6:30                       → 월~금 06:30
 *   오전 월 6:30 수,금 10:00              → 월 06:30, 수 10:00, 금 10:00
 *   오후 화,목 7:00(동) 7:30(하)          → 화 19:00, 목 19:00
 *
 * 정규화 출력: "요일 HH:mm" (한 줄에 하나씩, 요일순 → 시간순)
 */
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

// ─── 설정 ───
const DELAY_MS = 300;
const CONCURRENCY = 3;
const TIMEOUT = 15000;
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  Accept: 'text/html,application/xhtml+xml',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 요일 약어 → 풀네임 매핑
const DAY_FULL = {
  '월': '월요일', '화': '화요일', '수': '수요일',
  '목': '목요일', '금': '금요일', '토': '토요일', '일': '일요일',
};
const DAY_ABBRS = ['월', '화', '수', '목', '금', '토', '일'];

// 정렬용 요일 순서
const DAY_ORDER = ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일'];

// ─── 요일 범위/목록 확장 ───
// "월-금" → ['월', '화', '수', '목', '금']
// "월,수,금" → ['월', '수', '금']
// "화-목" → ['화', '수', '목']
function expandDays(dayStr) {
  const result = [];
  // 쉼표로 분리
  const parts = dayStr.split(/\s*,\s*/);
  for (const part of parts) {
    // 범위 형식: "월-금", "화-목"
    const rangeMatch = part.match(/^([월화수목금토일])\s*[-~]\s*([월화수목금토일])$/);
    if (rangeMatch) {
      const startIdx = DAY_ABBRS.indexOf(rangeMatch[1]);
      const endIdx = DAY_ABBRS.indexOf(rangeMatch[2]);
      if (startIdx >= 0 && endIdx >= 0 && startIdx <= endIdx) {
        for (let i = startIdx; i <= endIdx; i++) {
          if (!result.includes(DAY_ABBRS[i])) result.push(DAY_ABBRS[i]);
        }
      }
    } else {
      // 단일 요일
      const d = part.trim();
      if (DAY_ABBRS.includes(d) && !result.includes(d)) {
        result.push(d);
      }
    }
  }
  return result;
}

// ─── 시간 H:mm → HH:mm 패딩 ───
function padTime(h, m) {
  return h.toString().padStart(2, '0') + ':' + m.toString().padStart(2, '0');
}

// ─── (동)/(하) 필터 + 시간 추출 ───
// "7:00(동) 7:30(하)" → ["7:00"]  (동만)
// "6:30 10:00(교중)" → ["6:30", "10:00"]
// "4:00 7:30" → ["4:00", "7:30"]
function extractTimesWithFilter(text) {
  // 전략: 하절기(하) 태그된 시간을 먼저 제거하고, 남은 시간만 추출
  let cleaned = text;

  // 1) 접두사 형식 제거: "(하)6:00", "(하) 6:00"
  cleaned = cleaned.replace(/\(하[^)]*\)\s*\d{1,2}:\d{2}/g, '');

  // 2) 접미사 형식 제거: "7:30(하)", "7:30(하절기)"
  cleaned = cleaned.replace(/\d{1,2}:\d{2}\s*\(하[^)]*\)/g, '');

  // 3) 남은 괄호 설명 모두 제거 (동, 교중, 어린이 등)
  cleaned = cleaned.replace(/\([^)]*\)/g, '');

  // 4) 남은 H:mm 시간 추출
  const results = [];
  const regex = /(\d{1,2}):(\d{2})/g;
  let m;
  while ((m = regex.exec(cleaned)) !== null) {
    const h = parseInt(m[1]);
    const min = parseInt(m[2]);
    if (h >= 0 && h <= 23 && min >= 0 && min <= 59) {
      results.push({ h, min });
    }
  }
  return results;
}

// ─── 주일미사 파싱 ───
// "토요일 - 오후 7:00(동) 7:30(하)\n주일 - 오전 7:00 10:00(교중)"
// → [{ day: '토요일', time: '19:00' }, { day: '일요일', time: '07:00' }, ...]
function parseSundayMass(text) {
  if (!text || !text.trim()) return [];

  const entries = [];
  const lines = text.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // "토요일" 또는 "주일" 키워드 감지
    let day = null;
    if (/토요일|토\s*[-:：]/.test(trimmed)) {
      day = '토요일';
    } else if (/주일|일요일|일\s*[-:：]/.test(trimmed)) {
      day = '일요일';
    }
    if (!day) continue;

    // 오전/오후 컨텍스트 추적하며 시간 추출
    // "오전 6:30 10:30(교중) 오후 7:30" → 컨텍스트 전환
    let isPM = false;

    // 텍스트를 토큰화하여 순서대로 처리
    // "오후 4:00 7:30" → isPM=true, 16:00, 19:30
    // "오전 6:30 10:30(교중) 오후 7:30" → 06:30, 10:30, 19:30

    // 먼저 요일 접두사 제거
    const timePart = trimmed
      .replace(/^(토요일|주일|일요일)\s*[-:：]\s*/, '')
      .trim();

    // 오전/오후 구간별로 분리 처리
    // 패턴: (오전|오후)? 시간들... (오전|오후)? 시간들...
    const segments = timePart.split(/(오전|오후)/);

    let currentPeriod = ''; // 초기: 컨텍스트 없음
    for (const seg of segments) {
      const s = seg.trim();
      if (s === '오전') { currentPeriod = '오전'; continue; }
      if (s === '오후') { currentPeriod = '오후'; continue; }
      if (!s) continue;

      // 이 구간의 시간들 추출
      const times = extractTimesWithFilter(s);
      for (const t of times) {
        let h = t.h;
        // 오후 변환: 12보다 작으면 +12
        if (currentPeriod === '오후' && h < 12) h += 12;
        entries.push({ day, time: padTime(h, t.min) });
      }
    }
  }

  return entries;
}

// ─── 평일미사 파싱 ───
// "오전 월-금 6:30\n오후 화,목 7:00(동) 7:30(하)"
// → [{ day: '월요일', time: '06:30' }, { day: '화요일', time: '06:30' }, ...]
function parseWeekdayMass(text) {
  if (!text || !text.trim()) return [];

  const entries = [];
  const lines = text.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // 오전/오후 접두사 감지
    let isPM = false;
    let rest = trimmed;

    if (rest.startsWith('오전')) {
      isPM = false;
      rest = rest.substring(2).trim();
    } else if (rest.startsWith('오후')) {
      isPM = true;
      rest = rest.substring(2).trim();
    }

    // 나머지에서 "요일그룹 시간들" 패턴을 반복 추출
    // "월 6:30 수,금 10:00" → [월, 6:30] [수,금, 10:00]
    // "월-금 6:30" → [월-금, 6:30]
    // "화,목 7:30" → [화,목, 7:30]

    // 요일 그룹 + 시간들 패턴
    // 요일 그룹: 한글 요일(1글자) + 쉼표/하이픈으로 연결된 패턴
    const dayTimeRegex = /([월화수목금토일](?:\s*[-~,]\s*[월화수목금토일])*)\s+([\d:()동하교중어린이저녁새벽\s,]+?)(?=\s+[월화수목금토일](?:\s*[-~,]\s*[월화수목금토일])*\s+\d|$)/g;

    let match;
    const pairs = [];
    while ((match = dayTimeRegex.exec(rest)) !== null) {
      pairs.push({
        dayStr: match[1].trim(),
        timeStr: match[2].trim(),
      });
    }

    // 매칭 실패 시 단순 시간 추출 시도
    if (pairs.length === 0) {
      // 요일 없이 시간만 있는 경우 (폴백)
      const times = extractTimesWithFilter(rest);
      if (times.length > 0) {
        // 요일 정보 없으면 스킵
        continue;
      }
      continue;
    }

    // 각 요일-시간 쌍 처리
    for (const pair of pairs) {
      const days = expandDays(pair.dayStr);
      const times = extractTimesWithFilter(pair.timeStr);

      for (const d of days) {
        const dayFull = DAY_FULL[d];
        if (!dayFull) continue;
        for (const t of times) {
          let h = t.h;
          if (isPM && h < 12) h += 12;
          entries.push({ day: dayFull, time: padTime(h, t.min) });
        }
      }
    }
  }

  return entries;
}

// ─── entries → 정규화 텍스트 변환 ───
function entriesToNormalized(entries) {
  if (entries.length === 0) return null;

  // 중복 제거
  const unique = [];
  const seen = new Set();
  for (const e of entries) {
    const key = e.day + ' ' + e.time;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(e);
    }
  }

  // 정렬: 요일순 → 시간순
  unique.sort((a, b) => {
    const dayDiff = DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day);
    if (dayDiff !== 0) return dayDiff;
    return a.time.localeCompare(b.time);
  });

  return unique.map(e => `${e.day} ${e.time}`).join('\n');
}

// ─── HTML에서 미사시간 텍스트 추출 ───
function extractMassTimeText(html) {
  const $ = cheerio.load(html);

  let sundayText = '';
  let weekdayText = '';

  // .church_title "미사 시간" 찾기
  $('.church_title').each((_, el) => {
    if (!$(el).text().includes('미사 시간')) return;
    const wrap = $(el).next('.church_item_wrap');
    if (!wrap.length) return;

    // HTML → 텍스트 (br 태그를 줄바꿈으로)
    const rawHtml = wrap.html();
    const text = rawHtml
      .replace(/<br\s*\/?[^>]*>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim();

    // [주일미사]와 [평일미사] 구분
    const sundayMatch = text.match(/\[주일미사\]\s*([\s\S]*?)(?=\[평일미사\]|$)/);
    const weekdayMatch = text.match(/\[평일미사\]\s*([\s\S]*?)$/);

    if (sundayMatch) sundayText = sundayMatch[1].trim();
    if (weekdayMatch) weekdayText = weekdayMatch[1].trim();

    // 둘 다 없으면 전체 텍스트에서 시도
    if (!sundayText && !weekdayText) {
      // [주일미사]/[평일미사] 라벨 없는 경우 전체를 주일로 처리
      const cleaned = text
        .replace(/※[^\n]*/g, '')
        .trim();
      if (cleaned) sundayText = cleaned;
    }
  });

  return { sundayText, weekdayText };
}

// ─── 주소, 전화번호 추출 ───
function extractInfo(html) {
  const $ = cheerio.load(html);

  let address = '';
  let phone = '';

  // 주소: table.church_info_table에서 "주소" 행
  $('table.church_info_table tr').each((_, tr) => {
    const tds = $(tr).find('td');
    if (tds.length >= 2 && tds.eq(0).text().trim() === '주소') {
      address = tds.eq(1).text().trim().replace(/\s+/g, ' ');
    }
  });

  // 전화번호: table.church_member_table에서 "사무실" 행
  $('table.church_member_table tr').each((_, tr) => {
    const tds = $(tr).find('td');
    if (tds.length >= 1 && tds.eq(0).text().trim() === '사무실') {
      const phoneText = tds.last().text().trim();
      const m = phoneText.match(/(0\d{1,2}[-)]\d{3,4}[-)]\d{4})/);
      if (m) phone = m[1];
    }
  });

  return { address, phone };
}

// ─── 메인 ───
async function main() {
  console.log('=== 대구대교구 성당 미사시간 재스크래핑 시작 ===\n');

  // 성당 목록 로드
  const parishes = require('./daegu-parishes.json');
  console.log(`  성당 목록: ${parishes.length}개`);

  const results = [];
  let done = 0;
  let errors = 0;

  // 배치 스크래핑
  for (let i = 0; i < parishes.length; i += CONCURRENCY) {
    const batch = parishes.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.allSettled(
      batch.map(async (p) => {
        try {
          const resp = await axios.get(p.url, {
            timeout: TIMEOUT,
            headers: HEADERS,
            responseType: 'text',
          });
          const html = resp.data;

          // 기본 정보 추출
          const { address, phone } = extractInfo(html);

          // 미사시간 텍스트 추출
          const { sundayText, weekdayText } = extractMassTimeText(html);

          // 미사시간 파싱 + 정규화
          const sundayEntries = parseSundayMass(sundayText);
          const weekdayEntries = parseWeekdayMass(weekdayText);

          const sundayMass = entriesToNormalized(sundayEntries);
          const weekdayMass = entriesToNormalized(weekdayEntries);

          return {
            diocese: '대구대교구',
            name: p.name + '본당',
            address: address || null,
            phone: phone || null,
            sundayMass,
            weekdayMass,
            // 디버그용 원본 텍스트
            _rawSunday: sundayText,
            _rawWeekday: weekdayText,
          };
        } catch (e) {
          errors++;
          return {
            diocese: '대구대교구',
            name: p.name + '본당',
            address: null,
            phone: null,
            sundayMass: null,
            weekdayMass: null,
            _error: e.message,
          };
        }
      })
    );

    for (const r of batchResults) {
      if (r.status === 'fulfilled' && r.value) {
        results.push(r.value);
      }
    }

    done += batch.length;
    process.stdout.write(`\r  진행: ${done}/${parishes.length}`);
    if (i + CONCURRENCY < parishes.length) await sleep(DELAY_MS);
  }

  console.log(`\n\n  스크래핑 완료: ${results.length}개 성당 (에러: ${errors}개)\n`);

  // 데이터 품질 통계
  const withSunday = results.filter(c => c.sundayMass);
  const withWeekday = results.filter(c => c.weekdayMass);
  const withAddress = results.filter(c => c.address);
  const withPhone = results.filter(c => c.phone);
  console.log('  데이터 품질:');
  console.log(`    주소: ${withAddress.length}/${results.length}`);
  console.log(`    전화: ${withPhone.length}/${results.length}`);
  console.log(`    주일미사: ${withSunday.length}/${results.length}`);
  console.log(`    평일미사: ${withWeekday.length}/${results.length}`);

  // 샘플 출력
  console.log('\n  샘플 (처음 5개):');
  results.slice(0, 5).forEach(c => {
    console.log(`    [${c.name}]`);
    if (c._rawSunday) console.log(`      원본 주일: ${c._rawSunday.replace(/\n/g, ' | ')}`);
    console.log(`      정규화 주일: ${(c.sundayMass || '없음').replace(/\n/g, ' / ')}`);
    if (c._rawWeekday) console.log(`      원본 평일: ${c._rawWeekday.replace(/\n/g, ' | ')}`);
    console.log(`      정규화 평일: ${(c.weekdayMass || '없음').replace(/\n/g, ' / ')}`);
  });

  // 미사시간 없는 성당 목록
  const noMass = results.filter(c => !c.sundayMass && !c.weekdayMass);
  if (noMass.length > 0) {
    console.log(`\n  미사시간 없는 성당 (${noMass.length}개):`);
    noMass.forEach(c => {
      console.log(`    ${c.name}${c._error ? ' (에러: ' + c._error + ')' : ''}`);
    });
  }

  // 디버그 필드 제거
  const cleanResults = results.map(c => {
    const { _rawSunday, _rawWeekday, _error, ...clean } = c;
    return clean;
  });

  // 기존 JSON에서 대구대교구 교체
  const jsonPath = path.join(__dirname, '..', 'prisma', 'seed-data', 'church-directory.json');
  const existing = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  const filtered = existing.filter(c => c.diocese !== '대구대교구');
  console.log(`\n  기존 데이터: ${existing.length}개 (대구 제외: ${filtered.length}개)`);

  const combined = [...filtered, ...cleanResults];
  fs.writeFileSync(jsonPath, JSON.stringify(combined, null, 2), 'utf-8');
  console.log(`  통합 데이터: ${combined.length}개 → ${jsonPath}`);

  console.log('\n=== 대구대교구 스크래핑 완료 ===');
}

main().catch(err => {
  console.error('에러:', err.message);
  process.exit(1);
});
