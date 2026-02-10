/**
 * 정규화된 미사시간 데이터 → 엑셀 내보내기
 * 미사시간이 있는 1,005개 성당의 정규화된 데이터 + 파싱 결과를 엑셀로 출력
 */
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

// ─── buildTemplateData 간이 재구현 (TS 파일 직접 사용 불가) ───

// 한글 요일 → 영문 매핑
const koreanDayToEnglish = {
  '월': 'MONDAY', '화': 'TUESDAY', '수': 'WEDNESDAY',
  '목': 'THURSDAY', '금': 'FRIDAY', '토': 'SATURDAY', '일': 'SUNDAY',
};

// HH:mm 추출 (괄호 안 설명 무시)
function extractTimes(text) {
  const results = [];
  const matches = [...text.matchAll(/(\d{1,2}):(\d{2})/g)];
  for (const m of matches) {
    const h = parseInt(m[1]), min = parseInt(m[2]);
    if (h >= 0 && h <= 23 && min >= 0 && min <= 59) {
      results.push(h.toString().padStart(2, '0') + ':' + min.toString().padStart(2, '0'));
    }
  }
  // bare number 폴백
  if (results.length === 0) {
    const bare = [...text.matchAll(/(\d{1,2})(?=\s|,|$)/g)];
    for (const bm of bare) {
      const h = parseInt(bm[1]);
      if (h >= 0 && h <= 23) results.push(h.toString().padStart(2, '0') + ':00');
    }
  }
  // 한글 "시" 형식 폴백
  if (results.length === 0) {
    const korean = [...text.matchAll(/(오전|오후|새벽|저녁|밤)?\s*(\d{1,2})\s*시\s*(?:(\d{1,2})\s*분)?/g)];
    for (const km of korean) {
      const period = km[1] || '';
      let h = parseInt(km[2]);
      const min = km[3] ? parseInt(km[3]) : 0;
      if (['오후', '저녁', '밤'].includes(period) && h < 12) h += 12;
      if (h >= 0 && h <= 23) results.push(h.toString().padStart(2, '0') + ':' + min.toString().padStart(2, '0'));
    }
  }
  return [...new Set(results)];
}

// 요일 접두사 형식 파싱: "월: 06:00\n화: 10:00" → { 월: ["06:00"], 화: ["10:00"] }
function parseDayPrefixed(text) {
  const dayMap = {};
  const lines = text.split('\n');
  for (const line of lines) {
    const m = line.trim().match(/^([월화수목금토일])\s*[:：]/);
    if (!m) continue;
    const day = m[1];
    const timePart = line.substring(m[0].length + line.indexOf(m[0]));
    const times = extractTimes(timePart);
    if (times.length > 0) dayMap[day] = times;
  }
  return dayMap;
}

// 템플릿 수 계산
function countTemplates(sundayMass, weekdayMass) {
  let count = 0;
  // 주일
  if (sundayMass && sundayMass.trim()) {
    const hasDayPrefix = /^[월화수목금토일]\s*[:：]/m.test(sundayMass);
    if (hasDayPrefix) {
      const dayMap = parseDayPrefixed(sundayMass);
      for (const [day, times] of Object.entries(dayMap)) {
        count += times.length; // 각 시간이 1개 템플릿
      }
    } else {
      count += extractTimes(sundayMass).length;
    }
  }
  // 평일
  if (weekdayMass && weekdayMass.trim()) {
    const hasDayPrefix = /^[월화수목금토일]\s*[:：]/m.test(weekdayMass);
    if (hasDayPrefix) {
      const dayMap = parseDayPrefixed(weekdayMass);
      // 같은 시간+같은 유형은 그룹핑되므로, 고유 시간×유형 조합 계산
      const timeToTypes = {}; // time → Set<type>
      for (const [day, times] of Object.entries(dayMap)) {
        const eng = koreanDayToEnglish[day];
        const type = eng === 'SATURDAY' ? 'SAT' : eng === 'SUNDAY' ? 'SUN' : 'WEEK';
        for (const t of times) {
          const key = t + '|' + type;
          if (!timeToTypes[key]) timeToTypes[key] = new Set();
          timeToTypes[key].add(eng);
        }
      }
      count += Object.keys(timeToTypes).length;
    } else {
      count += extractTimes(weekdayMass).length;
    }
  }
  return count;
}

// 미사시간을 읽기 쉬운 한 줄 요약으로 변환
function summarizeMass(massText) {
  if (!massText || !massText.trim()) return '';
  const hasDayPrefix = /^[월화수목금토일]\s*[:：]/m.test(massText);
  if (hasDayPrefix) {
    const dayMap = parseDayPrefixed(massText);
    const dayOrder = ['월', '화', '수', '목', '금', '토', '일'];
    return dayOrder
      .filter(d => dayMap[d])
      .map(d => d + ': ' + dayMap[d].join(', '))
      .join(' / ');
  }
  return extractTimes(massText).join(', ');
}

// ─── 메인 ───

async function main() {
  // JSON 로드
  const jsonPath = path.join(__dirname, '..', 'prisma', 'seed-data', 'church-directory.json');
  const allData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

  // 미사시간 있는 성당만 필터
  const withMass = allData.filter(c => c.sundayMass || c.weekdayMass);

  console.log(`전체: ${allData.length}개, 미사시간 보유: ${withMass.length}개\n`);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Mass Time Normalizer';
  workbook.created = new Date();

  // ─── 공통 스타일 ───
  const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2B5797' } };
  const headerFont = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: '맑은 고딕' };
  const borderThin = { style: 'thin', color: { argb: 'FFD0D0D0' } };
  const cellBorder = { top: borderThin, left: borderThin, bottom: borderThin, right: borderThin };
  const altRowFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F8FC' } };

  // 헤더 스타일 적용 함수
  function styleHeader(sheet) {
    const row = sheet.getRow(1);
    row.font = headerFont;
    row.fill = headerFill;
    row.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    row.height = 28;
  }

  // 테두리 + 줄무늬 적용 함수
  function styleRows(sheet) {
    sheet.eachRow((row, rowNum) => {
      row.eachCell(cell => {
        cell.border = cellBorder;
        cell.font = { ...cell.font, name: '맑은 고딕', size: 10 };
      });
      // 짝수 행 배경색
      if (rowNum > 1 && rowNum % 2 === 0) {
        row.eachCell(cell => { cell.fill = altRowFill; });
      }
    });
  }

  // ════════════════════════════════════════
  // 시트 1: 전체 통합 (미사시간 있는 1,005개)
  // ════════════════════════════════════════
  const mainSheet = workbook.addWorksheet('전체 미사시간', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  mainSheet.columns = [
    { header: '번호', key: 'no', width: 6 },
    { header: '교구', key: 'diocese', width: 12 },
    { header: '성당명', key: 'name', width: 20 },
    { header: '주소', key: 'address', width: 40 },
    { header: '전화번호', key: 'phone', width: 16 },
    { header: '주일미사 (정규화)', key: 'sundayNorm', width: 45 },
    { header: '평일미사 (정규화)', key: 'weekdayNorm', width: 45 },
    { header: '템플릿 수', key: 'templateCount', width: 10 },
  ];

  styleHeader(mainSheet);

  // 교구별 그룹핑
  const dioceseGroups = {};

  withMass.forEach((c, i) => {
    if (!dioceseGroups[c.diocese]) dioceseGroups[c.diocese] = [];
    dioceseGroups[c.diocese].push(c);

    const tCount = countTemplates(c.sundayMass, c.weekdayMass);

    const row = mainSheet.addRow({
      no: i + 1,
      diocese: c.diocese,
      name: c.name,
      address: c.address || '',
      phone: c.phone || '',
      sundayNorm: c.sundayMass || '',
      weekdayNorm: c.weekdayMass || '',
      templateCount: tCount,
    });

    // 미사시간 셀 줄바꿈
    row.getCell('sundayNorm').alignment = { wrapText: true, vertical: 'top' };
    row.getCell('weekdayNorm').alignment = { wrapText: true, vertical: 'top' };
    // 템플릿 수 가운데 정렬
    row.getCell('templateCount').alignment = { horizontal: 'center', vertical: 'middle' };
  });

  styleRows(mainSheet);
  mainSheet.autoFilter = { from: 'A1', to: `H${withMass.length + 1}` };

  // ════════════════════════════════════════
  // 시트 2: 교구별 요약 통계
  // ════════════════════════════════════════
  const statsSheet = workbook.addWorksheet('교구별 통계', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  statsSheet.columns = [
    { header: '교구', key: 'diocese', width: 16 },
    { header: '전체 성당', key: 'total', width: 12 },
    { header: '미사시간 보유', key: 'withMass', width: 14 },
    { header: '보유율', key: 'rate', width: 10 },
    { header: '주일미사', key: 'withSunday', width: 12 },
    { header: '평일미사', key: 'withWeekday', width: 12 },
    { header: '총 템플릿', key: 'templates', width: 12 },
    { header: '성당당 평균', key: 'avg', width: 12 },
  ];

  styleHeader(statsSheet);

  // 교구별 통계 계산
  const dioceseOrder = [...new Set(allData.map(c => c.diocese))];
  let grandTotal = 0, grandWithMass = 0, grandTemplates = 0;

  for (const diocese of dioceseOrder) {
    const all = allData.filter(c => c.diocese === diocese);
    const mass = all.filter(c => c.sundayMass || c.weekdayMass);
    const sunday = mass.filter(c => c.sundayMass && c.sundayMass.trim());
    const weekday = mass.filter(c => c.weekdayMass && c.weekdayMass.trim());
    const templates = mass.reduce((sum, c) => sum + countTemplates(c.sundayMass, c.weekdayMass), 0);
    const avg = mass.length > 0 ? (templates / mass.length).toFixed(1) : '0';

    grandTotal += all.length;
    grandWithMass += mass.length;
    grandTemplates += templates;

    const row = statsSheet.addRow({
      diocese,
      total: all.length,
      withMass: mass.length,
      rate: mass.length > 0 ? Math.round((mass.length / all.length) * 100) + '%' : '0%',
      withSunday: sunday.length,
      withWeekday: weekday.length,
      templates,
      avg,
    });
    row.eachCell(cell => {
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    row.getCell('diocese').alignment = { horizontal: 'left', vertical: 'middle' };
  }

  // 합계 행
  const totalRow = statsSheet.addRow({
    diocese: '합계',
    total: grandTotal,
    withMass: grandWithMass,
    rate: Math.round((grandWithMass / grandTotal) * 100) + '%',
    withSunday: withMass.filter(c => c.sundayMass && c.sundayMass.trim()).length,
    withWeekday: withMass.filter(c => c.weekdayMass && c.weekdayMass.trim()).length,
    templates: grandTemplates,
    avg: (grandTemplates / grandWithMass).toFixed(1),
  });
  totalRow.font = { bold: true, name: '맑은 고딕', size: 10 };
  totalRow.eachCell(cell => {
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE6F1' } };
  });
  totalRow.getCell('diocese').alignment = { horizontal: 'left', vertical: 'middle' };

  styleRows(statsSheet);

  // ════════════════════════════════════════
  // 시트 3~: 교구별 상세 (미사시간 보유분만)
  // ════════════════════════════════════════
  for (const diocese of dioceseOrder) {
    const items = dioceseGroups[diocese];
    if (!items || items.length === 0) continue;

    // 시트 이름: "서울", "대전" 등 (30자 제한 대응)
    const sheetName = diocese.replace(/교구|대교구/, '') || diocese;

    const sheet = workbook.addWorksheet(sheetName, {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    sheet.columns = [
      { header: '번호', key: 'no', width: 6 },
      { header: '성당명', key: 'name', width: 20 },
      { header: '주소', key: 'address', width: 40 },
      { header: '전화번호', key: 'phone', width: 16 },
      { header: '주일미사', key: 'sundayNorm', width: 45 },
      { header: '평일미사', key: 'weekdayNorm', width: 45 },
      { header: '템플릿 수', key: 'templateCount', width: 10 },
    ];

    styleHeader(sheet);

    items.forEach((c, i) => {
      const tCount = countTemplates(c.sundayMass, c.weekdayMass);
      const row = sheet.addRow({
        no: i + 1,
        name: c.name,
        address: c.address || '',
        phone: c.phone || '',
        sundayNorm: c.sundayMass || '',
        weekdayNorm: c.weekdayMass || '',
        templateCount: tCount,
      });
      row.getCell('sundayNorm').alignment = { wrapText: true, vertical: 'top' };
      row.getCell('weekdayNorm').alignment = { wrapText: true, vertical: 'top' };
      row.getCell('templateCount').alignment = { horizontal: 'center', vertical: 'middle' };
    });

    styleRows(sheet);
    sheet.autoFilter = { from: 'A1', to: `G${items.length + 1}` };
  }

  // ─── 파일 저장 ───
  const outputPath = path.join(__dirname, '..', `정규화_미사시간_${withMass.length}개_성당.xlsx`);
  await workbook.xlsx.writeFile(outputPath);

  console.log('=== 엑셀 생성 완료 ===');
  console.log(`  파일: ${outputPath}`);
  console.log(`  시트 구성:`);
  console.log(`    1. 전체 미사시간 (${withMass.length}개 성당)`);
  console.log(`    2. 교구별 통계 (${dioceseOrder.length}개 교구)`);
  for (const diocese of dioceseOrder) {
    const items = dioceseGroups[diocese];
    if (items) {
      const name = diocese.replace(/교구|대교구/, '');
      console.log(`    ${name}: ${items.length}개`);
    }
  }
  console.log(`  총 템플릿: ${grandTemplates}개 (성당당 평균 ${(grandTemplates / grandWithMass).toFixed(1)}개)`);
}

main().catch(console.error);
