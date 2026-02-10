/**
 * 파싱 검증 스크립트
 * church-directory.json의 모든 미사시간 데이터가
 * buildTemplateData()로 정상 파싱되는지 검증
 */
import * as fs from 'fs';
import * as path from 'path';
import { buildTemplateData } from '../lib/church-directory';

interface ChurchData {
  diocese: string;
  name: string;
  sundayMass: string | null;
  weekdayMass: string | null;
}

// JSON 데이터 로드
const jsonPath = path.join(__dirname, '..', 'prisma', 'seed-data', 'church-directory.json');
const data: ChurchData[] = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

// 미사시간이 있는 성당만 필터링
const withMass = data.filter(c => c.sundayMass || c.weekdayMass);
console.log(`\n=== 파싱 검증 시작 (${withMass.length}개 성당) ===\n`);

let success = 0;
let fail = 0;
const failures: { name: string; diocese: string; reason: string }[] = [];

for (const church of withMass) {
  const templates = buildTemplateData(church.sundayMass, church.weekdayMass, church.name);

  // 주일미사가 있는데 SUNDAY/SATURDAY 템플릿이 하나도 없으면 실패
  if (church.sundayMass) {
    const hasSundayTemplate = templates.some(
      t => t.massType === 'SUNDAY' || t.massType === 'SATURDAY'
    );
    if (!hasSundayTemplate) {
      fail++;
      failures.push({
        name: church.name,
        diocese: church.diocese,
        reason: `주일미사 파싱 실패 (템플릿 0개) - 원본: "${church.sundayMass.substring(0, 80)}"`,
      });
      continue;
    }
  }

  // 평일미사가 있는데 WEEKDAY/SATURDAY 템플릿이 하나도 없으면 실패
  if (church.weekdayMass) {
    const hasWeekdayTemplate = templates.some(
      t => t.massType === 'WEEKDAY' || t.massType === 'SATURDAY'
    );
    if (!hasWeekdayTemplate) {
      fail++;
      failures.push({
        name: church.name,
        diocese: church.diocese,
        reason: `평일미사 파싱 실패 (템플릿 0개) - 원본: "${church.weekdayMass.substring(0, 80)}"`,
      });
      continue;
    }
  }

  success++;
}

// 결과 출력
console.log(`  성공: ${success}/${withMass.length} (${((success / withMass.length) * 100).toFixed(1)}%)`);
console.log(`  실패: ${fail}/${withMass.length}`);

if (failures.length > 0) {
  console.log('\n=== 실패 목록 ===');
  for (const f of failures) {
    console.log(`  [${f.diocese}] ${f.name}: ${f.reason}`);
  }
}

// 교구별 통계
console.log('\n=== 교구별 템플릿 통계 ===');
const dioceseStats: Record<string, { count: number; totalTemplates: number }> = {};
for (const church of withMass) {
  const templates = buildTemplateData(church.sundayMass, church.weekdayMass, church.name);
  if (!dioceseStats[church.diocese]) {
    dioceseStats[church.diocese] = { count: 0, totalTemplates: 0 };
  }
  dioceseStats[church.diocese].count++;
  dioceseStats[church.diocese].totalTemplates += templates.length;
}
for (const [diocese, stats] of Object.entries(dioceseStats).sort((a, b) => b[1].count - a[1].count)) {
  const avg = (stats.totalTemplates / stats.count).toFixed(1);
  console.log(`  ${diocese}: ${stats.count}개 성당, 평균 ${avg}개 템플릿`);
}

// 샘플 출력
console.log('\n=== 샘플 파싱 결과 (교구별 1개) ===');
const seenDioceses = new Set<string>();
for (const church of withMass) {
  if (seenDioceses.has(church.diocese)) continue;
  seenDioceses.add(church.diocese);
  const templates = buildTemplateData(church.sundayMass, church.weekdayMass, church.name);
  console.log(`\n[${church.diocese}] ${church.name} → ${templates.length}개 템플릿`);
  for (const t of templates.slice(0, 5)) {
    console.log(`  ${t.massType.padEnd(9)} ${t.time} ${t.dayOfWeek.join(',')} → "${t.name}"`);
  }
  if (templates.length > 5) console.log(`  ... 외 ${templates.length - 5}개`);
}

console.log(`\n=== 검증 완료: ${success === withMass.length ? '100% 성공' : `${fail}개 실패`} ===`);
