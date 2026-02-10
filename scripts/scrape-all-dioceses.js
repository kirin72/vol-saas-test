/**
 * 전국 천주교 교구별 성당 정보 수집 → 엑셀 변환 스크립트
 * 각 교구 사이트별 개별 파서로 성당명, 주소, 전화번호, 미사시간 수집
 */
const axios = require('axios');
const cheerio = require('cheerio');
const ExcelJS = require('exceljs');
const iconv = require('iconv-lite');
const fs = require('fs');
const path = require('path');

// ─── 공통 설정 ───
const DELAY_MS = 300;
const CONCURRENCY = 3;
const TIMEOUT = 15000;
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 공통 데이터 형태
function church(diocese, name, address, phone, sundayMass, weekdayMass, extra = {}) {
  return { diocese, name, address: address || '', phone: phone || '', sundayMass: sundayMass || '', weekdayMass: weekdayMass || '', ...extra };
}

// 동시성 제한 fetch
async function fetchBatch(items, fn, concurrency = CONCURRENCY) {
  const results = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const br = await Promise.allSettled(batch.map(fn));
    br.forEach((r) => {
      if (r.status === 'fulfilled' && r.value) results.push(r.value);
    });
    if (i + concurrency < items.length) await sleep(DELAY_MS);
  }
  return results;
}

async function get(url, opts = {}) {
  return axios.get(url, { timeout: TIMEOUT, headers: HEADERS, responseType: 'text', ...opts });
}

// SSO 3단계 우회 함수 (수원/광주교구용 — 307→SSO→302→원본URL→200)
async function fetchWithSso(url) {
  // 1단계: 원본 URL → 307 → SSO URL (쿠키 획득)
  const r1 = await axios.get(url, {
    timeout: TIMEOUT, headers: HEADERS,
    maxRedirects: 0, validateStatus: (s) => true,
  });
  if (r1.status === 200) return r1.data;
  if (r1.status !== 307 || !r1.headers.location) return null;
  const cookie1 = (r1.headers['set-cookie'] || []).map(c => c.split(';')[0]).join('; ');

  // 2단계: SSO URL → 302 → 원본 URL (세션 쿠키 획득)
  const r2 = await axios.get(r1.headers.location, {
    timeout: TIMEOUT, headers: { ...HEADERS, Cookie: cookie1 },
    maxRedirects: 0, validateStatus: (s) => true,
  });
  const cookie2 = (r2.headers['set-cookie'] || []).map(c => c.split(';')[0]).join('; ');
  const allCookies = [cookie1, cookie2].filter(Boolean).join('; ');

  // 3단계: 최종 URL → 200 (실제 페이지)
  const finalUrl = r2.headers.location
    ? (r2.headers.location.startsWith('http') ? r2.headers.location : new URL(r2.headers.location, url).href)
    : url;
  const r3 = await axios.get(finalUrl, {
    timeout: TIMEOUT, headers: { ...HEADERS, Cookie: allCookies },
    maxRedirects: 5,
  });
  return r3.data;
}

// ════════════════════════════════════════
// 1. 서울대교구 (maria.catholic.or.kr)
// ════════════════════════════════════════
async function scrapeSeoul() {
  console.log('\n[서울대교구] 수집 시작...');
  const listUrl = 'https://maria.catholic.or.kr/mobile/bondang/bondang_list.asp?flag=4&s_indexLow=&s_indexHigh=&gyoguCode=&s_name=';
  const res = await get(listUrl);
  const $ = cheerio.load(res.data);

  const churches = [];
  $('a[href*="bondang_view.asp"]').each((i, el) => {
    const href = $(el).attr('href');
    const text = $(el).text().trim();
    const orgnum = href.match(/orgnum=(\d+)/)?.[1];
    if (orgnum && text) churches.push({ orgnum, name: text });
  });

  console.log(`  목록: ${churches.length}개`);

  const results = [];
  let done = 0;
  for (let i = 0; i < churches.length; i += CONCURRENCY) {
    const batch = churches.slice(i, i + CONCURRENCY);
    const br = await Promise.all(
      batch.map(async (c) => {
        try {
          const r = await get(`https://maria.catholic.or.kr/mobile/bondang/bondang_view.asp?orgnum=${c.orgnum}`);
          const $d = cheerio.load(r.data);

          let address = '',
            phone = '';
          $d('.bv_block_box.type02 li').each((j, li) => {
            const t = $d(li).text().trim().replace(/\u00a0/g, ' ');
            if (t.match(/^\(\d{5}\)/)) address = t;
            else if (t.startsWith('전화번호:')) phone = t.replace('전화번호:', '').trim();
          });

          let sunday = '',
            weekday = '';
          let section = '';
          $d('table.register05 tr').each((j, tr) => {
            const th = $d(tr).find('th').text().trim();
            if (th.includes('주일미사')) section = 'sunday';
            if (th.includes('평일미사')) section = 'weekday';
            const tds = $d(tr).find('td');
            if (tds.length >= 2) {
              const day = tds.eq(0).text().trim();
              const time = tds.eq(1).text().trim().replace(/\s+/g, ' ');
              if (day && time) {
                const entry = day + ': ' + time;
                if (section === 'sunday') sunday += (sunday ? '\n' : '') + entry;
                else if (section === 'weekday') weekday += (weekday ? '\n' : '') + entry;
              }
            }
          });

          return church('서울대교구', c.name, address, phone, sunday, weekday);
        } catch (e) {
          return church('서울대교구', c.name, '', '', '(조회실패)', '');
        }
      })
    );
    results.push(...br);
    done += batch.length;
    process.stdout.write(`\r  ${done}/${churches.length}`);
    if (i + CONCURRENCY < churches.length) await sleep(DELAY_MS);
  }
  console.log(` → ${results.length}개 완료`);
  return results;
}

// ════════════════════════════════════════
// 2. 전주교구 (jcatholic.or.kr)
// ════════════════════════════════════════
async function scrapeJeonju() {
  console.log('\n[전주교구] 수집 시작...');
  const res = await get('https://www.jcatholic.or.kr/theme/main/pages/area.php');
  const $ = cheerio.load(res.data);

  const results = [];
  // 페이지에 이름/주소/전화/팩스가 모두 있음
  // 각 성당은 li 또는 div로 나열, churchview.php?intSeq= 링크
  // area.php 페이지에서 미사시간은 상세페이지에만 있음 → 상세 생략, 기본정보만
  const items = [];
  $('a[href*="churchview.php"]').each((i, el) => {
    const text = $(el).text().trim();
    const href = $(el).attr('href');
    if (text && href) items.push({ name: text, href });
  });

  // 주소/전화 추출 - area.php 전체 텍스트에서 각 성당 정보 블록 파싱
  // 실제 HTML 구조: 테이블 형태로 성당명, 주소, 전화, 팩스 나열
  $('table').each((i, table) => {
    $(table)
      .find('tr')
      .each((j, tr) => {
        const tds = $(tr).find('td');
        if (tds.length >= 4) {
          const name = tds.eq(0).text().trim();
          const addr = tds.eq(1).text().trim();
          const tel = tds.eq(2).text().trim();
          if (name && name.includes('성당')) {
            results.push(church('전주교구', name, addr, tel, '', ''));
          }
        }
      });
  });

  // 테이블 방식 실패 시 대안 - WebFetch로 이미 얻은 96개 데이터를 하드코딩 대신 재파싱
  if (results.length === 0) {
    // 페이지 전체에서 패턴 기반 추출
    const text = res.data;
    const blocks = text.split(/churchview\.php/);
    for (let i = 1; i < blocks.length; i++) {
      // 이름 추출
      const nameMatch = blocks[i].match(/>([^<]+)</);
      if (nameMatch) {
        const name = nameMatch[1].trim();
        // 주소: 우편번호 패턴
        const addrMatch = blocks[i].match(/(\d{5}[^<]{5,60})/);
        // 전화: 063- 패턴
        const telMatch = blocks[i].match(/(0\d{1,2}[-)]\d{3,4}[-)]\d{4}[~\d]*)/);
        if (name.length > 1 && name.length < 20) {
          results.push(
            church('전주교구', name, addrMatch?.[1]?.trim() || '', telMatch?.[1] || '', '', '')
          );
        }
      }
    }
  }

  console.log(`  → ${results.length}개 완료`);
  return results;
}

// ════════════════════════════════════════
// 3. 대전교구 (djcatholic.or.kr) - EUC-KR 인코딩 / 14개 지구 / h3+li/span 구조
// ════════════════════════════════════════
async function scrapeDaejeon() {
  console.log('\n[대전교구] 수집 시작...');

  // EUC-KR 인코딩 페이지 → arraybuffer로 받아 iconv-lite로 디코딩
  async function getEucKr(url) {
    const res = await axios.get(url, { timeout: TIMEOUT, headers: HEADERS, responseType: 'arraybuffer' });
    const html = iconv.decode(Buffer.from(res.data), 'euc-kr');
    return html;
  }

  // 1단계: 메인 페이지에서 14개 지구명 추출
  const mainHtml = await getEucKr('https://www.djcatholic.or.kr/home/pages/church.php');

  // goArea() 호출에서 지구명 추출
  const districts = [];
  const seenDistrict = new Set();
  const areaRegex = /goArea\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  let match;
  while ((match = areaRegex.exec(mainHtml)) !== null) {
    const name = match[1].trim();
    if (name && !seenDistrict.has(name)) {
      seenDistrict.add(name);
      districts.push(name);
    }
  }
  console.log(`  지구 ${districts.length}개: ${districts.join(', ')}`);

  // 2단계: 각 지구 페이지에서 h3 "본당정보" 블록 파싱
  const results = [];
  for (const district of districts) {
    try {
      // EUC-KR 인코딩된 area 파라미터
      const encodedArea = iconv.encode(district, 'euc-kr');
      const percentEncoded = Array.from(encodedArea)
        .map((b) => '%' + b.toString(16).toUpperCase().padStart(2, '0'))
        .join('');
      const url = `https://www.djcatholic.or.kr/home/pages/church.php?area=${percentEncoded}`;

      const html = await getEucKr(url);
      const $ = cheerio.load(html);

      let districtCount = 0;

      // 각 .modal-body 안에 하나의 성당 정보가 있음
      $('.modal-body').each((_, modal) => {
        const h3 = $(modal).find('h3').first();
        const h3Text = h3.text().trim();
        const nameMatch = h3Text.match(/^([가-힣\s]+)\s*본당/);
        if (!nameMatch) return;
        const name = nameMatch[1].trim();

        let address = '', phone = '', sundayMass = '', weekdayMass = '';

        // modal-body 안의 li span 파싱
        $(modal).find('li').each((_, li) => {
          const spans = [];
          $(li).find('span').each((_, s) => spans.push($(s).text().trim()));
          if (spans.length < 2) return;

          const label = spans[0];
          const value = spans.slice(1).join(' ').trim();

          if (label === '본당주소' || label.includes('주소')) {
            address = value;
          } else if (label === '본당전화/팩스') {
            const m = value.match(/(0\d{1,2}[-)]\d{3,4}[-)]\d{4})/);
            if (m) phone = m[1];
          } else if (label === '미사시간' || label.includes('미사')) {
            // ▶평일, ▶토요일, ▶주일 파싱
            const sundayM = value.match(/▶주일\s*[-–]\s*([^\n▶]+)/);
            if (sundayM) sundayMass = sundayM[1].trim();
            const weekdayM = value.match(/▶평일\s*[-–]\s*([^\n▶]+)/);
            if (weekdayM) weekdayMass = weekdayM[1].trim();
            const satM = value.match(/▶토요일\s*[-–]\s*([^\n▶]+)/);
            if (satM) sundayMass = (sundayMass ? sundayMass + ' / 토: ' : '토: ') + satM[1].trim();
          }
        });

        results.push(church('대전교구', name + '성당', address, phone, sundayMass, weekdayMass));
        districtCount++;
      });

      process.stdout.write(`\r  ${district}: ${districtCount}개`);
    } catch (e) {
      console.log(`  ${district} 오류: ${e.message}`);
    }
    await sleep(500);
  }

  console.log(`\n  → ${results.length}개 완료`);
  return results;
}

// ════════════════════════════════════════
// 4. 제주교구 (diocesejeju.or.kr)
// ════════════════════════════════════════
async function scrapeJeju() {
  console.log('\n[제주교구] 수집 시작...');
  const res = await get('https://www.diocesejeju.or.kr/mass_time');
  const $ = cheerio.load(res.data);

  const results = [];
  const seen = new Set();

  // mass_time 페이지의 테이블 1~4가 각 지구 (테이블 0은 특별미사)
  // 구조: Row 0 = 헤더 (성당 | 평일미사 | 주일미사)
  //        Row 1 = 요일 헤더 (월~일)
  //        Row 2+ = 성당 데이터 (성당명 | 월~토 미사시간 | 주일미사시간)
  $('table').each((tableIdx, table) => {
    // 테이블 0 (특별미사) 건너뛰기 - 헤더 첫 셀이 "구분"인지 확인
    const firstHeader = $(table).find('tr').first().find('td, th').first().text().trim();
    if (firstHeader === '구분') return;

    $(table).find('tr').each((rowIdx, tr) => {
      // 헤더 행 (0, 1) 건너뛰기
      if (rowIdx < 2) return;

      // 성당명은 <th>, 미사시간은 <td>
      const th = $(tr).find('th').first();
      const tds = $(tr).find('td');
      if (!th.length || tds.length < 2) return;

      const rawName = th.text().trim().replace(/\s+/g, ' ');
      if (!rawName || rawName.length < 1) return;

      // "길찾기" 등 부가 텍스트 제거
      const name = rawName.replace(/길찾기/g, '').replace(/\s*공소.*$/g, '').trim();
      if (!name || name.length < 1 || seen.has(name)) return;
      seen.add(name);

      // 평일미사: td[0]~td[5] = 월~토
      const weekdayParts = [];
      for (let c = 0; c < Math.min(6, tds.length - 1); c++) {
        const dayText = tds.eq(c).text().trim().replace(/\s+/g, ' ');
        if (dayText) weekdayParts.push(dayText);
      }
      const weekdayMass = weekdayParts.length > 0 ? weekdayParts[0] + ' (월)' : '';

      // 주일미사: td 마지막 = 일요일
      const sundayMass = tds.last().text().trim().replace(/\s+/g, ' ');

      results.push(church('제주교구', name + '본당', '', '', sundayMass, weekdayMass));
    });
  });

  console.log(`  → ${results.length}개 완료`);
  return results;
}

// ════════════════════════════════════════
// 5. 인천교구 (caincheon.or.kr)
// ════════════════════════════════════════
async function scrapeIncheon() {
  console.log('\n[인천교구] 수집 시작...');
  // 지구별 페이지에 모든 성당 링크가 있음 (134개) - 재시도 포함
  let res;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      res = await get('http://www.caincheon.or.kr/church/church_jigu.do', { timeout: 45000 });
      break;
    } catch (e) {
      if (attempt < 2) {
        console.log(`  재시도 ${attempt + 1}/3...`);
        await sleep(3000);
      } else {
        throw e;
      }
    }
  }
  const $ = cheerio.load(res.data);

  const churches = [];
  const seen = new Set();
  $('a[href*="church_jigu.do?churchIdx="]').each((i, el) => {
    const href = $(el).attr('href');
    const text = $(el).text().trim();
    const m = href.match(/churchIdx=(\d+)/);
    if (m && text && text.length > 1 && text.length < 20 && !seen.has(m[1])) {
      seen.add(m[1]);
      churches.push({
        name: text,
        url: 'http://www.caincheon.or.kr' + href,
        idx: m[1],
      });
    }
  });

  console.log(`  성당 ${churches.length}개 상세 수집...`);
  const results = [];
  let done = 0;
  for (let i = 0; i < churches.length; i += CONCURRENCY) {
    const batch = churches.slice(i, i + CONCURRENCY);
    const br = await Promise.all(
      batch.map(async (c) => {
        try {
          const r = await get(c.url);
          const $d = cheerio.load(r.data);
          const text = $d('body').text();
          const addr = text.match(/((?:인천|부천|시흥|김포|강화|옹진)[^\n]{5,60})/);
          const tel = text.match(/(0\d{1,2}[-)]\d{3,4}[-)]\d{4})/);
          return church('인천교구', c.name, addr?.[1]?.trim() || '', tel?.[1] || '', '', '');
        } catch (e) {
          return church('인천교구', c.name, '', '', '', '');
        }
      })
    );
    results.push(...br);
    done += batch.length;
    process.stdout.write(`\r  ${done}/${churches.length}`);
    if (i + CONCURRENCY < churches.length) await sleep(DELAY_MS);
  }
  console.log('');

  console.log(`  → ${results.length}개 완료`);
  return results;
}

// ════════════════════════════════════════
// 6. 광주대교구 (gjcatholic.or.kr) - SSO 우회 + 상세 페이지 스크래핑
// ════════════════════════════════════════
async function scrapeGwangju() {
  console.log('\n[광주대교구] 수집 시작...');

  // 사전 수집된 성당 목록 (이름 + 상세 URL 포함)
  const parishes = require('./gwangju-parishes.json');
  console.log(`  목록: ${parishes.length}개, 상세 수집 중...`);

  const results = [];
  let done = 0;

  for (let i = 0; i < parishes.length; i += CONCURRENCY) {
    const batch = parishes.slice(i, i + CONCURRENCY);
    const br = await Promise.all(
      batch.map(async (p) => {
        try {
          // SSO 우회하여 페이지 접근
          const html = await fetchWithSso(p.url);
          if (!html) return church('광주대교구', p.name + '본당', '', '', '', '');
          const $ = cheerio.load(html);

          // 주소: 본문에서 우편번호 패턴으로 추출 (th/td가 아닌 텍스트)
          let address = '';
          const bodyText = $('body').text();
          const addrMatch = bodyText.match(/(\d{5}\)[^\n]{5,80})/);
          if (addrMatch) address = addrMatch[1].trim();

          // 전화번호: th="전화번호" → 다음 td
          let phone = '';
          $('th').each((_, el) => {
            if ($(el).text().trim() === '전화번호') {
              phone = $(el).next('td').text().trim();
            }
          });

          // 미사시간: 요일별 th/td 쌍 추출
          let sundayMass = '';
          const weekdayParts = [];

          $('table').each((_, table) => {
            $(table).find('tr').each((_, tr) => {
              const ths = $(tr).find('th');
              const tds = $(tr).find('td');
              ths.each((idx, th) => {
                const day = $(th).text().trim();
                const time = tds.eq(idx) ? tds.eq(idx).text().trim().replace(/\s+/g, ' ') : '';
                if (!time) return;
                if (day === '주일' || day === '일') {
                  sundayMass = time;
                } else if (['월', '화', '수', '목', '금', '토'].includes(day)) {
                  weekdayParts.push(day + ': ' + time);
                }
              });
            });
          });

          const weekdayMass = weekdayParts.length > 0 ? weekdayParts.join(', ') : '';

          return church('광주대교구', p.name + '본당', address, phone, sundayMass, weekdayMass);
        } catch (e) {
          return church('광주대교구', p.name + '본당', '', '', '', '');
        }
      })
    );
    results.push(...br);
    done += batch.length;
    process.stdout.write(`\r  ${done}/${parishes.length}`);
    if (i + CONCURRENCY < parishes.length) await sleep(DELAY_MS);
  }
  console.log(`\n  → ${results.length}개 완료`);
  return results;
}

// ════════════════════════════════════════
// 7. 춘천교구 (cccatholic.or.kr)
// ════════════════════════════════════════
async function scrapeChuncheon() {
  console.log('\n[춘천교구] 수집 시작...');

  // 지구별 페이지: /parish/parish/1 ~ /parish/parish/8
  const viewLinks = [];
  const seen = new Set();

  for (let page = 1; page <= 8; page++) {
    try {
      const r = await get(`https://www.cccatholic.or.kr/parish/parish/${page}`);
      const $ = cheerio.load(r.data);

      // /parish/parish/view/숫자 링크 수집
      $('a[href*="/parish/parish/view/"]').each((i, el) => {
        const href = $(el).attr('href');
        if (href) {
          const id = href.match(/\/view\/(\d+)/)?.[1];
          if (id && !seen.has(id)) {
            seen.add(id);
            viewLinks.push({ url: 'https://www.cccatholic.or.kr' + href, id });
          }
        }
      });
    } catch (e) { /* skip */ }
    await sleep(200);
  }

  console.log(`  성당 ${viewLinks.length}개 발견, 상세 수집...`);
  const results = [];
  let done = 0;

  for (let i = 0; i < viewLinks.length; i += CONCURRENCY) {
    const batch = viewLinks.slice(i, i + CONCURRENCY);
    const br = await Promise.all(
      batch.map(async (c) => {
        try {
          const r = await get(c.url);
          const $d = cheerio.load(r.data);

          // 성당명: .church_view 또는 .section_content 내 첫 텍스트
          let name = '';
          const contentEl = $d('.church_view, .section_content');
          if (contentEl.length) {
            name = contentEl.find('h2, h3, strong').first().text().trim()
              || contentEl.text().trim().split('\n')[0].trim();
          }
          if (!name) name = `춘천교구 성당 (ID:${c.id})`;

          // 테이블 1: 기본 정보 (지구, 전화번호, 주소 등)
          let phone = '', address = '', sundayMass = '', weekdayMass = '';
          $d('table').each((ti, table) => {
            $d(table).find('tr').each((ri, tr) => {
              const th = $d(tr).find('th').text().trim();
              const td = $d(tr).find('td').text().trim().replace(/\s+/g, ' ');
              if (th === '전화번호') phone = td;
              else if (th === '주소') address = td;
              else if (th === '주일') sundayMass = td;
              // 평일미사: 월~토 중 첫 번째
              else if (['월', '화', '수', '목', '금', '토'].includes(th) && !weekdayMass) {
                weekdayMass = td + ' (' + th + ')';
              }
            });
          });

          return church('춘천교구', name, address, phone, sundayMass, weekdayMass);
        } catch (e) {
          return null;
        }
      })
    );
    br.forEach(r => { if (r) results.push(r); });
    done += batch.length;
    process.stdout.write(`  ${done}/${viewLinks.length}`);
    if (i + CONCURRENCY < viewLinks.length) await sleep(DELAY_MS);
  }
  console.log('');

  console.log(`  → ${results.length}개 완료`);
  return results;
}

// ════════════════════════════════════════
// 8. 청주교구 (cdcj.or.kr)
// ════════════════════════════════════════
async function scrapeCheongju() {
  console.log('\n[청주교구] 수집 시작...');
  const res = await get('https://www.cdcj.or.kr/parish/parish');
  const $ = cheerio.load(res.data);

  const results = [];
  const seen = new Set();

  const links = [];
  $('a[href*="/parish/parish/view/"]').each((i, el) => {
    const href = $(el).attr('href');
    const text = $(el).text().trim();
    if (href && text && text.length > 1 && text.length < 20) {
      const id = href.match(/\/view\/(\d+)/)?.[1];
      if (id && !seen.has(id)) {
        seen.add(id);
        links.push({ name: text, url: 'https://www.cdcj.or.kr' + href });
      }
    }
  });

  if (links.length > 0) {
    console.log(`  성당 ${links.length}개 상세 수집...`);
    let done = 0;
    for (let i = 0; i < links.length; i += CONCURRENCY) {
      const batch = links.slice(i, i + CONCURRENCY);
      const br = await Promise.all(
        batch.map(async (c) => {
          try {
            const r = await get(c.url);
            const $d = cheerio.load(r.data);
            const text = $d('body').text();
            const addr = text.match(/((?:충북|충남|청주|충주|제천|보은|옥천|영동|진천|괴산|음성|단양)[^\n]{5,60})/);
            const tel = text.match(/(0\d{1,2}[-)]\d{3,4}[-)]\d{4})/);
            return church('청주교구', c.name, addr?.[1]?.trim() || '', tel?.[1] || '', '', '');
          } catch (e) {
            return church('청주교구', c.name, '', '', '', '');
          }
        })
      );
      results.push(...br);
      done += batch.length;
      process.stdout.write(`\r  ${done}/${links.length}`);
      if (i + CONCURRENCY < links.length) await sleep(DELAY_MS);
    }
    console.log('');
  }

  console.log(`  → ${results.length}개 완료`);
  return results;
}

// ════════════════════════════════════════
// 9. 안동교구 (acatholic.or.kr)
// ════════════════════════════════════════
async function scrapeAndong() {
  console.log('\n[안동교구] 수집 시작...');

  // 지구별 페이지 (cate=1~7)
  const results = [];
  const seen = new Set();
  const links = [];

  for (let cate = 0; cate <= 7; cate++) {
    try {
      const url = cate === 0
        ? 'https://www.acatholic.or.kr/sub3/sub1.asp'
        : `https://www.acatholic.or.kr/sub3/sub1.asp?cate=${cate}`;
      const r = await get(url);
      const $ = cheerio.load(r.data);

      $('a[href*="sub1_view.asp"]').each((i, el) => {
        const href = $(el).attr('href') || '';
        const text = $(el).text().trim();
        const seqMatch = href.match(/seq=(\d+)/);
        if (text && text.length > 1 && text.length < 20 && seqMatch && !seen.has(seqMatch[1])) {
          seen.add(seqMatch[1]);
          const fullUrl = 'https://www.acatholic.or.kr/sub3/' + href;
          links.push({ name: text, url: fullUrl });
        }
      });
    } catch (e) { /* skip */ }
    await sleep(200);
  }

  if (links.length > 0) {
    console.log(`  성당 ${links.length}개 상세 수집...`);
    let done = 0;
    for (let i = 0; i < links.length; i += CONCURRENCY) {
      const batch = links.slice(i, i + CONCURRENCY);
      const br = await Promise.all(
        batch.map(async (c) => {
          try {
            const r = await get(c.url);
            const $d = cheerio.load(r.data);
            const text = $d('body').text();
            const addr = text.match(/((?:경북|경상북도|안동|영주|영천|구미|김천|상주|문경|예천|봉화|영양|청송|울진|포항|경주)[^\n]{5,60})/);
            const tel = text.match(/(0\d{1,2}[-)]\d{3,4}[-)]\d{4})/);
            return church('안동교구', c.name, addr?.[1]?.trim() || '', tel?.[1] || '', '', '');
          } catch (e) {
            return church('안동교구', c.name, '', '', '', '');
          }
        })
      );
      results.push(...br);
      done += batch.length;
      process.stdout.write(`\r  ${done}/${links.length}`);
      if (i + CONCURRENCY < links.length) await sleep(DELAY_MS);
    }
    console.log('');
  }

  console.log(`  → ${results.length}개 완료`);
  return results;
}

// ════════════════════════════════════════
// 10. 원주교구 (wjcatholic.or.kr)
// ════════════════════════════════════════
async function scrapeWonju() {
  console.log('\n[원주교구] 수집 시작...');

  // 지구별 목록 페이지에서 성당 목록 + 상세 링크 수집
  const jiguNames = ['남원주지구', '북원주지구', '서원주지구', '횡성지구', '제천지구', '태백지구', '영평정지구', '영동지구'];
  const churchLinks = [];
  const seen = new Set();

  for (const jigu of jiguNames) {
    try {
      const url = `http://www.wjcatholic.or.kr/parish/list?ca=${encodeURIComponent(jigu)}`;
      const r = await get(url);
      const $ = cheerio.load(r.data);

      // 구조: strong.sbj=성당명, span.txt=수호성인, a[href*="/parish/view"]=상세링크
      $('a[href*="/parish/view"]').each((i, el) => {
        const href = $(el).attr('href');
        if (!href || seen.has(href)) return;
        seen.add(href);

        // 부모 요소에서 성당명 추출
        const parent = $(el).closest('li, div.info, div');
        const name = parent.find('strong.sbj').text().trim() || parent.find('strong').first().text().trim();
        if (!name) return;

        const fullUrl = href.startsWith('http') ? href : 'http://www.wjcatholic.or.kr' + href;
        churchLinks.push({ name, url: fullUrl, jigu });
      });
    } catch (e) {
      // skip
    }
    await sleep(200);
  }

  console.log(`  성당 ${churchLinks.length}개 발견, 상세 수집...`);
  const results = [];
  let done = 0;

  for (let i = 0; i < churchLinks.length; i += CONCURRENCY) {
    const batch = churchLinks.slice(i, i + CONCURRENCY);
    const br = await Promise.all(
      batch.map(async (c) => {
        try {
          const r = await get(c.url);
          const $d = cheerio.load(r.data);

          // strong.sbj에서 성당명 (상세 페이지)
          const detailName = $d('strong.sbj').text().trim() || c.name;

          // Table 0: 연락처 정보 (주임신부, 사무실, 팩스)
          let phone = '';
          $d('table').first().find('tr').each((ri, tr) => {
            const cells = $d(tr).find('th, td');
            cells.each((ci, cell) => {
              const label = $d(cell).text().trim();
              if (label === '사무실' || label === '대표전화') {
                const next = $d(cell).next().text().trim();
                if (next) phone = next;
              }
            });
          });

          // Table 1: 미사시간
          let sundayMass = '', weekdayMass = '';
          const tables = $d('table');
          if (tables.length >= 2) {
            $d(tables[1]).find('tr').each((ri, tr) => {
              const th = $d(tr).find('th, td').first().text().trim();
              const td = $d(tr).find('td').last().text().trim().replace(/\s+/g, ' ');
              if (th === '주일미사') sundayMass = td;
              else if (th === '월' && !weekdayMass) weekdayMass = td + ' (월)';
            });
          }

          // 주소: body 텍스트에서 추출
          const bodyText = $d('body').text();
          const addr = bodyText.match(/(강원[특별자치도]*\s*[가-힣\s\d\-()]+(?:길|로|동|리|번지)[\s\d\-]*)/);

          return church('원주교구', detailName, addr?.[1]?.trim() || '', phone, sundayMass, weekdayMass);
        } catch (e) {
          return church('원주교구', c.name, '', '', '', '');
        }
      })
    );
    results.push(...br);
    done += batch.length;
    process.stdout.write(`  ${done}/${churchLinks.length}`);
    if (i + CONCURRENCY < churchLinks.length) await sleep(DELAY_MS);
  }
  console.log('');

  console.log(`  → ${results.length}개 완료`);
  return results;
}

// ════════════════════════════════════════
// 11. 대구대교구 (daegu-archdiocese.or.kr) - 상세 페이지 스크래핑
// ════════════════════════════════════════
async function scrapeDaegu() {
  console.log('\n[대구대교구] 수집 시작...');

  // 사전 수집된 성당 목록 (이름 + 상세 URL 포함)
  const parishes = require('./daegu-parishes.json');
  console.log(`  목록: ${parishes.length}개, 상세 수집 중...`);

  const results = [];
  let done = 0;

  for (let i = 0; i < parishes.length; i += CONCURRENCY) {
    const batch = parishes.slice(i, i + CONCURRENCY);
    const br = await Promise.all(
      batch.map(async (p) => {
        try {
          const r = await get(p.url);
          const $ = cheerio.load(r.data);

          let address = '', phone = '', sundayMass = '', weekdayMass = '';

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

          // 미사시간: .church_title "미사 시간" 다음의 .church_item_wrap
          $('.church_title').each((_, el) => {
            if (!$(el).text().includes('미사 시간')) return;
            const wrap = $(el).next('.church_item_wrap');
            if (!wrap.length) return;
            const text = wrap.html()
              .replace(/<br\s*\/?>/gi, '\n')
              .replace(/<[^>]+>/g, '')
              .trim();

            // [주일미사] 파싱
            const sundayM = text.match(/\[주일미사\]\s*([\s\S]*?)(?=\[평일미사\]|$)/);
            if (sundayM) sundayMass = sundayM[1].trim().replace(/\n/g, ' ').replace(/\s+/g, ' ');

            // [평일미사] 파싱
            const weekdayM = text.match(/\[평일미사\]\s*([\s\S]*?)$/);
            if (weekdayM) weekdayMass = weekdayM[1].trim().replace(/\n/g, ' ').replace(/\s+/g, ' ');

            // 패턴 매칭 실패 시 전체 텍스트
            if (!sundayMass && !weekdayMass) {
              sundayMass = text.replace(/\n/g, ' ').replace(/\s+/g, ' ').substring(0, 200);
            }
          });

          return church('대구대교구', p.name + '본당', address, phone, sundayMass, weekdayMass);
        } catch (e) {
          return church('대구대교구', p.name + '본당', '', '', '', '');
        }
      })
    );
    results.push(...br);
    done += batch.length;
    process.stdout.write(`\r  ${done}/${parishes.length}`);
    if (i + CONCURRENCY < parishes.length) await sleep(DELAY_MS);
  }
  console.log(`\n  → ${results.length}개 완료`);
  return results;
}

// ════════════════════════════════════════
// 12. 수원교구 (casuwon.or.kr) - SSO 우회 + 상세 페이지 스크래핑
// ════════════════════════════════════════
async function scrapeSuwon() {
  console.log('\n[수원교구] 수집 시작...');

  // 사전 수집된 성당 목록 (이름 + 상세 URL 포함)
  const parishes = require('./suwon-parishes.json');
  console.log(`  목록: ${parishes.length}개, 상세 수집 중...`);

  const results = [];
  let done = 0;

  for (let i = 0; i < parishes.length; i += CONCURRENCY) {
    const batch = parishes.slice(i, i + CONCURRENCY);
    const br = await Promise.all(
      batch.map(async (p) => {
        try {
          // SSO 우회하여 페이지 접근
          const url = encodeURI(p.url);
          const html = await fetchWithSso(url);
          if (!html) return church('수원교구', p.name + '본당', '', '', '', '');
          const $ = cheerio.load(html);

          // 주소: icon_location 이미지의 부모 텍스트
          let address = '';
          $('img[src*="icon_location"]').each((_, img) => {
            const parent = $(img).parent();
            address = parent.text().trim();
          });
          // 대안: 본문에서 우편번호 패턴
          if (!address) {
            const bodyText = $('body').text();
            const addrMatch = bodyText.match(/(\d{5}\)[^\n]{5,80})/);
            if (addrMatch) address = addrMatch[1].trim();
          }

          // 전화번호: <span><img icon_phone_blue></span> 다음의 <p> 태그
          let phone = '';
          $('img[src*="icon_phone_blue"]').each((_, img) => {
            // span > img 구조이므로 span의 형제 p에서 전화번호
            const span = $(img).parent();
            const nextP = span.next('p');
            if (nextP.length) {
              const m = nextP.text().match(/(0\d{1,2}[-)]\d{3,4}[-)]\d{4})/);
              if (m) phone = m[1];
            }
            // 대안: 부모 li의 전체 텍스트에서 추출
            if (!phone) {
              const li = span.closest('li');
              const m = li.text().match(/(0\d{1,2}[-)]\d{3,4}[-)]\d{4})/);
              if (m) phone = m[1];
            }
          });

          // 미사시간: table.massTable (th=요일, td=시간 구조)
          let sundayMass = '';
          const weekdayParts = [];

          $('table.massTable tr').each((_, tr) => {
            const day = $(tr).find('th').text().trim();
            const time = $(tr).find('td').text().trim().replace(/\s+/g, ' ');
            if (!time || !day) return;
            if (day === '주일' || day === '일') {
              sundayMass += (sundayMass ? ', ' : '') + time;
            } else if (['월', '화', '수', '목', '금', '토'].includes(day)) {
              weekdayParts.push(day + ': ' + time);
            }
          });

          const weekdayMass = weekdayParts.length > 0 ? weekdayParts.join(', ') : '';

          return church('수원교구', p.name + '본당', address, phone, sundayMass, weekdayMass);
        } catch (e) {
          return church('수원교구', p.name + '본당', '', '', '', '');
        }
      })
    );
    results.push(...br);
    done += batch.length;
    process.stdout.write(`\r  ${done}/${parishes.length}`);
    if (i + CONCURRENCY < parishes.length) await sleep(DELAY_MS);
  }
  console.log(`\n  → ${results.length}개 완료`);
  return results;
}

// ════════════════════════════════════════
// 12. 의정부교구 (ucatholic.or.kr)
// ════════════════════════════════════════
async function scrapeUijeongbu() {
  console.log('\n[의정부교구] 수집 시작...');
  try {
    const res = await get('http://ucatholic.or.kr/bbs/board.php?bo_table=church_map');
    const $ = cheerio.load(res.data);

    const results = [];
    const seen = new Set();

    // 성당 목록 페이지에서 데이터 추출
    $('a, tr, li').each((i, el) => {
      const text = $(el).text().trim();
      if (text.includes('성당') && text.length > 3 && text.length < 200) {
        const nameM = text.match(/([^\s]{2,10}\s*성당)/);
        const addrM = text.match(/((?:경기|서울|의정부|동두천|양주|포천|연천|파주|고양|남양주|구리)[^\n]{5,60})/);
        const telM = text.match(/(0\d{1,2}[-)]\d{3,4}[-)]\d{4})/);
        if (nameM && !seen.has(nameM[1])) {
          seen.add(nameM[1]);
          results.push(church('의정부교구', nameM[1], addrM?.[1]?.trim() || '', telM?.[1] || '', '', ''));
        }
      }
    });

    console.log(`  → ${results.length}개 완료`);
    return results;
  } catch (e) {
    console.log(`  → 실패: ${e.message}`);
    return [];
  }
}

// ════════════════════════════════════════
// 엑셀 생성
// ════════════════════════════════════════
async function writeExcel(allData, outputPath) {
  console.log('\n[엑셀] 파일 생성 중...');

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Diocese Scraper';
  workbook.created = new Date();

  // 교구별 시트 + 전체 통합 시트
  const allSheet = workbook.addWorksheet('전체 통합', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  const columns = [
    { header: '번호', key: 'no', width: 6 },
    { header: '교구', key: 'diocese', width: 14 },
    { header: '성당명', key: 'name', width: 18 },
    { header: '주소', key: 'address', width: 45 },
    { header: '전화번호', key: 'phone', width: 18 },
    { header: '주일미사', key: 'sundayMass', width: 40 },
    { header: '평일미사', key: 'weekdayMass', width: 40 },
  ];

  allSheet.columns = columns;

  // 헤더 스타일
  const headerStyle = (sheet) => {
    const row = sheet.getRow(1);
    row.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
    row.alignment = { horizontal: 'center', vertical: 'middle' };
    row.height = 24;
  };
  headerStyle(allSheet);

  // 전체 데이터 추가
  let globalNo = 1;
  const dioceseGroups = {};

  allData.forEach((d) => {
    if (!dioceseGroups[d.diocese]) dioceseGroups[d.diocese] = [];
    dioceseGroups[d.diocese].push(d);

    const row = allSheet.addRow({
      no: globalNo++,
      diocese: d.diocese,
      name: d.name,
      address: d.address,
      phone: d.phone,
      sundayMass: d.sundayMass,
      weekdayMass: d.weekdayMass,
    });
    row.getCell('sundayMass').alignment = { wrapText: true, vertical: 'top' };
    row.getCell('weekdayMass').alignment = { wrapText: true, vertical: 'top' };

    if ((globalNo - 1) % 2 === 0) {
      row.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F7FB' } };
      });
    }
  });

  // 테두리
  const border = { style: 'thin', color: { argb: 'FFD0D0D0' } };
  allSheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = { top: border, left: border, bottom: border, right: border };
    });
  });

  // 자동 필터
  allSheet.autoFilter = { from: 'A1', to: `G${allData.length + 1}` };

  // 교구별 시트
  Object.entries(dioceseGroups).forEach(([diocese, items]) => {
    const sheet = workbook.addWorksheet(diocese.replace(/교구|대교구/, ''), {
      views: [{ state: 'frozen', ySplit: 1 }],
    });
    sheet.columns = columns.filter((c) => c.key !== 'diocese');
    headerStyle(sheet);

    items.forEach((d, i) => {
      const row = sheet.addRow({
        no: i + 1,
        name: d.name,
        address: d.address,
        phone: d.phone,
        sundayMass: d.sundayMass,
        weekdayMass: d.weekdayMass,
      });
      row.getCell('sundayMass').alignment = { wrapText: true, vertical: 'top' };
      row.getCell('weekdayMass').alignment = { wrapText: true, vertical: 'top' };
    });

    sheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = { top: border, left: border, bottom: border, right: border };
      });
    });
  });

  await workbook.xlsx.writeFile(outputPath);
  console.log(`  → 저장 완료: ${outputPath}`);
}

// ════════════════════════════════════════
// 메인
// ════════════════════════════════════════
async function main() {
  console.log('=== 전국 교구별 성당 정보 수집기 ===\n');

  const scrapers = [
    { name: '서울대교구', fn: scrapeSeoul },
    { name: '전주교구', fn: scrapeJeonju },
    { name: '대전교구', fn: scrapeDaejeon },
    { name: '제주교구', fn: scrapeJeju },
    { name: '인천교구', fn: scrapeIncheon },
    { name: '광주대교구', fn: scrapeGwangju },
    { name: '춘천교구', fn: scrapeChuncheon },
    { name: '청주교구', fn: scrapeCheongju },
    { name: '안동교구', fn: scrapeAndong },
    { name: '원주교구', fn: scrapeWonju },
    { name: '대구대교구', fn: scrapeDaegu },
    { name: '수원교구', fn: scrapeSuwon },
    { name: '의정부교구', fn: scrapeUijeongbu },
  ];

  const allData = [];

  for (const scraper of scrapers) {
    try {
      const data = await scraper.fn();
      allData.push(...data);
    } catch (e) {
      console.error(`\n[${scraper.name}] 오류: ${e.message}`);
    }
  }

  // 통계
  console.log('\n=== 수집 통계 ===');
  const byDiocese = {};
  allData.forEach((d) => {
    if (!byDiocese[d.diocese]) byDiocese[d.diocese] = 0;
    byDiocese[d.diocese]++;
  });
  Object.entries(byDiocese).forEach(([d, c]) => console.log(`  ${d}: ${c}개`));
  console.log(`  ─────────────`);
  console.log(`  총계: ${allData.length}개`);

  // 접속 불가 교구 안내
  console.log('\n[참고] 접속 불가/데이터 미수집 교구:');
  console.log('  - 부산교구 (접속 차단)');
  console.log('  - 마산교구 (서버 타임아웃)');

  // 엑셀 저장
  const outputPath = path.join(__dirname, '..', '전국_성당_목록.xlsx');
  await writeExcel(allData, outputPath);

  // JSON 시드 데이터 저장 (DB 시딩용)
  const seedDir = path.join(__dirname, '..', 'prisma', 'seed-data');
  if (!fs.existsSync(seedDir)) fs.mkdirSync(seedDir, { recursive: true });
  const jsonPath = path.join(seedDir, 'church-directory.json');
  fs.writeFileSync(jsonPath, JSON.stringify(allData, null, 2), 'utf-8');
  console.log(`  → JSON 시드 저장: ${jsonPath}`);

  console.log('\n=== 완료 ===');
}

main().catch((e) => {
  console.error('실행 오류:', e.message);
  process.exit(1);
});
