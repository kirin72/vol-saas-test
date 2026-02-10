/**
 * 인천대교구 성당 미사시간 스크래퍼
 * http://www.caincheon.or.kr/church/church_misa.do
 *
 * HTML 구조:
 *   <tr class="question"> → 성당명, 사제, 주소, 전화
 *   <tr class="answer">   → <i>요일</i><em>시간</em> 반복
 *
 * pageSize=200으로 전체 135개 한 번에 로드
 */
const fs = require('fs');
const path = require('path');

// ─── 한글 시간 → HH:mm 변환 ───
function koreanTimeToHHmm(text) {
  const results = [];
  // "오전 10시 30분", "오후 6시", "오전 6시 30분" 등
  const regex = /(오전|오후|새벽|저녁|밤)?\s*(\d{1,2})\s*시\s*(?:(\d{1,2})\s*분)?/g;
  let m;
  while ((m = regex.exec(text)) !== null) {
    const period = m[1] || '';
    let h = parseInt(m[2]);
    const min = m[3] ? parseInt(m[3]) : 0;
    if (['오후', '저녁', '밤'].includes(period) && h < 12) h += 12;
    if (h >= 0 && h <= 23 && min >= 0 && min <= 59) {
      results.push(h.toString().padStart(2, '0') + ':' + min.toString().padStart(2, '0'));
    }
  }
  return results;
}

// ─── HTML 파싱 ───
function parseChurches(html) {
  const churches = [];

  // question/answer 행 쌍 추출
  // question 행: 성당 기본 정보
  // answer 행: 미사시간 (있을 수도 없을 수도)
  const rowPairRegex = /<tr\s+class="question[^"]*">([\s\S]*?)<\/tr>\s*<tr\s+class="answer">([\s\S]*?)<\/tr>/g;
  let match;

  while ((match = rowPairRegex.exec(html)) !== null) {
    const questionHtml = match[1];
    const answerHtml = match[2];

    // 성당명 추출: <th> 안의 <a> 태그 텍스트
    const nameMatch = questionHtml.match(/<th[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/);
    const name = nameMatch ? nameMatch[1].replace(/<[^>]*>/g, '').trim() : '';
    if (!name) continue;

    // 주소 추출: 4번째 <td>
    const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/g;
    const tds = [];
    let tdMatch;
    while ((tdMatch = tdRegex.exec(questionHtml)) !== null) {
      tds.push(tdMatch[1].replace(/<[^>]*>/g, '').trim());
    }

    // tds[0] = "미사시간 보기", tds[1] = 사제명+번호, tds[2] = 주소, tds[3] = 전화
    const address = tds[2] || '';
    const phone = tds[3] || '';

    // 미사시간 추출: <i>요일</i><em>시간</em> 쌍
    const dayTimeRegex = /<i[^>]*>([\s\S]*?)<\/i>\s*<em>([\s\S]*?)<\/em>/g;
    const dayTimes = {};
    let dtMatch;

    while ((dtMatch = dayTimeRegex.exec(answerHtml)) !== null) {
      const day = dtMatch[1].replace(/<[^>]*>/g, '').trim();
      const timeText = dtMatch[2].replace(/<[^>]*>/g, '').replace(/\([^)]*\)/g, ' ').trim();

      // 비고 행 스킵
      if (day === '비고') continue;

      // 한글 시간 → HH:mm 변환
      const times = koreanTimeToHHmm(timeText);
      if (times.length > 0) {
        dayTimes[day] = times;
      }
    }

    // 주일/평일 분리
    const sundayDays = ['토', '일'];
    const weekdayDays = ['월', '화', '수', '목', '금'];

    // 주일미사: 토 + 일
    const sundayParts = [];
    for (const d of sundayDays) {
      if (dayTimes[d]) {
        sundayParts.push(d + ': ' + dayTimes[d].join(', '));
      }
    }

    // 평일미사: 월~금
    const weekdayParts = [];
    for (const d of weekdayDays) {
      if (dayTimes[d]) {
        weekdayParts.push(d + ': ' + dayTimes[d].join(', '));
      }
    }

    churches.push({
      diocese: '인천대교구',
      name: name + '성당', // 사이트는 "가정3동" 형태 → "가정3동성당"으로 통일
      address: address || null,
      phone: phone || null,
      sundayMass: sundayParts.join('\n') || null,
      weekdayMass: weekdayParts.join('\n') || null,
    });
  }

  return churches;
}

// ─── 메인 ───
async function main() {
  console.log('=== 인천대교구 성당 스크래핑 시작 ===\n');

  // 전체 135개 한 번에 로드 (pageSize=200)
  const url = 'http://www.caincheon.or.kr/church/church_misa.do?pageSize=200&pageNo=1&';
  console.log('  요청: ' + url);

  const resp = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      Accept: 'text/html,application/xhtml+xml',
    },
  });

  if (!resp.ok) {
    throw new Error('HTTP ' + resp.status);
  }

  const html = await resp.text();
  console.log('  응답: ' + html.length + ' bytes\n');

  // 파싱
  const churches = parseChurches(html);
  console.log('  파싱 완료: ' + churches.length + '개 성당\n');

  // 데이터 품질 확인
  const withSunday = churches.filter(c => c.sundayMass);
  const withWeekday = churches.filter(c => c.weekdayMass);
  const withAddress = churches.filter(c => c.address);
  const withPhone = churches.filter(c => c.phone);
  console.log('  데이터 품질:');
  console.log('    주소: ' + withAddress.length + '/' + churches.length);
  console.log('    전화: ' + withPhone.length + '/' + churches.length);
  console.log('    주일미사: ' + withSunday.length + '/' + churches.length);
  console.log('    평일미사: ' + withWeekday.length + '/' + churches.length);

  // 샘플 출력
  console.log('\n  샘플 (처음 3개):');
  churches.slice(0, 3).forEach(c => {
    console.log('    [' + c.name + ']');
    console.log('      주소: ' + c.address);
    console.log('      주일: ' + (c.sundayMass || '없음').replace(/\n/g, ' / '));
    console.log('      평일: ' + (c.weekdayMass || '없음').replace(/\n/g, ' / '));
  });

  // 기존 JSON에 추가
  const jsonPath = path.join(__dirname, '..', 'prisma', 'seed-data', 'church-directory.json');
  const existing = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

  // 기존 인천대교구 데이터 제거 (있으면)
  const filtered = existing.filter(c => c.diocese !== '인천대교구');
  console.log('\n  기존 데이터: ' + existing.length + '개 (인천 제외: ' + filtered.length + '개)');

  // 인천 추가
  const combined = [...filtered, ...churches];
  fs.writeFileSync(jsonPath, JSON.stringify(combined, null, 2), 'utf-8');
  console.log('  통합 데이터: ' + combined.length + '개 → ' + jsonPath);

  console.log('\n=== 인천대교구 스크래핑 완료 ===');
}

main().catch(err => {
  console.error('에러:', err.message);
  process.exit(1);
});
