/**
 * 봉사자 배정표 PDF 생성 유틸리티
 * jspdf + jspdf-autotable로 직접 테이블 PDF 생성
 * 전치 레이아웃: 날짜가 가로(컬럼), 역할이 세로(행)
 */
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { registerKoreanFont } from '@/lib/pdf/load-korean-font';
import { vestmentColorLabels } from '@/lib/validations/template';

// 배정 데이터 타입 (assignments 페이지의 MassSchedule과 동일)
interface ScheduleForPdf {
  id: string;
  date: string;
  time: string;
  notes: string | null;
  massTemplate: {
    id: string;
    massType: string;
    vestmentColor: string | null;
    slots: Array<{
      id: string;
      requiredCount: number;
      volunteerRole: {
        id: string;
        name: string;
        color: string;
      };
    }>;
  } | null;
  assignments: Array<{
    id: string;
    userId: string;
    volunteerRoleId: string;
    status: string;
    user: {
      id: string;
      name: string;
      baptismalName: string | null;
    };
    volunteerRole: {
      id: string;
      name: string;
      color: string;
    };
  }>;
}

// 날짜별 그룹 (같은 날짜 병합용)
interface DateGroup {
  date: string;              // '2025-02-01'
  dateLabel: string;         // '2/1(일)'
  schedules: ScheduleForPdf[];
}

// 컬럼 메타데이터 (각 일정의 정보)
interface ColumnMeta {
  schedule: ScheduleForPdf;
  dateGroup: DateGroup;
  timeLabel: string;         // '오전 10시'
  massType: string;          // 'SUNDAY' | 'SATURDAY' | 'WEEKDAY' | 'SPECIAL'
  isSundayOrSpecial: boolean; // 굵은 테두리 적용 여부
}

// hex 색상 → RGB 배열 변환 (예: '#2563eb' → [37, 99, 235])
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

// 24시간 → 12시간 형식 변환 (예: "13:00" → "오후 1시")
const formatTime12Hour = (time24: string) => {
  const [hourStr, minute] = time24.split(':');
  const hour = parseInt(hourStr);
  const period = hour < 12 ? '오전' : '오후';
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${period} ${hour12}시${minute === '30' ? ' 30분' : ''}`;
};

// 날짜 포맷 (예: "2/1(일)")
const formatDateShort = (dateString: string) => {
  const date = new Date(dateString);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  const weekday = weekdays[date.getDay()];
  return `${month}/${day}(${weekday})`;
};

// 모든 일정에서 고유 역할 목록 추출
const extractUniqueRoles = (schedules: ScheduleForPdf[]) => {
  const roleMap = new Map<string, { id: string; name: string; color: string }>();

  // 모든 일정의 슬롯에서 역할 수집
  schedules.forEach((schedule) => {
    schedule.massTemplate?.slots.forEach((slot) => {
      if (!roleMap.has(slot.volunteerRole.id)) {
        roleMap.set(slot.volunteerRole.id, {
          id: slot.volunteerRole.id,
          name: slot.volunteerRole.name,
          color: slot.volunteerRole.color,
        });
      }
    });
  });

  return Array.from(roleMap.values());
};

// 봉사자 이름 포맷 (세례명 포함)
const formatVolunteerName = (user: { name: string; baptismalName: string | null }) => {
  if (user.baptismalName) {
    return `${user.name}(${user.baptismalName})`;
  }
  return user.name;
};

// 색상 상수
const HEADER_BG = hexToRgb('#e8e8e8');     // 기본 헤더 배경
const APPROVAL_BG = hexToRgb('#f5f5f5');   // 결재란 배경
const NO_SLOT_BG = hexToRgb('#f0f0f0');    // 슬롯 없음 배경
const RED = hexToRgb('#cc0000');            // 미배정 텍스트
const GRAY_TEXT = hexToRgb('#999999');      // 비활성 텍스트

// ─── 전치 레이아웃 헬퍼 함수 ───

/**
 * 날짜별 그룹화 (같은 날짜 병합용)
 * 같은 날짜의 일정들을 그룹으로 묶어 colSpan 계산에 사용
 */
function groupSchedulesByDate(schedules: ScheduleForPdf[]): DateGroup[] {
  const groups = new Map<string, ScheduleForPdf[]>();

  // 날짜별로 일정 그룹화
  schedules.forEach((schedule) => {
    const dateKey = schedule.date;
    if (!groups.has(dateKey)) {
      groups.set(dateKey, []);
    }
    groups.get(dateKey)!.push(schedule);
  });

  // 날짜순 정렬 후 DateGroup 배열 생성
  return Array.from(groups.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, scheds]) => ({
      date,
      dateLabel: formatDateShort(date),
      // 같은 날짜 내에서 시간순 정렬
      schedules: scheds.sort((a, b) => a.time.localeCompare(b.time)),
    }));
}

/**
 * 컬럼 메타데이터 생성
 * 각 일정(컬럼)의 massType, 시간 등 정보를 미리 계산
 */
function buildColumnMetas(dateGroups: DateGroup[]): ColumnMeta[] {
  const metas: ColumnMeta[] = [];

  dateGroups.forEach((dateGroup) => {
    dateGroup.schedules.forEach((schedule) => {
      metas.push({
        schedule,
        dateGroup,
        timeLabel: formatTime12Hour(schedule.time),
        massType: schedule.massTemplate?.massType || 'WEEKDAY',
        // 일요일 또는 특전미사 → 굵은 테두리 적용
        isSundayOrSpecial:
          schedule.massTemplate?.massType === 'SUNDAY' ||
          schedule.massTemplate?.massType === 'SPECIAL',
      });
    });
  });

  return metas;
}

/**
 * 헤더 1행: 날짜 (같은 날짜는 colSpan 병합)
 * 예: ['', { content: '2/1(일)', colSpan: 2 }, '2/2(월)', ...]
 */
function buildDateHeaderRow(dateGroups: DateGroup[]): any[] {
  // 첫 번째 셀: 빈 라벨 영역 (rowSpan=2로 시간 행까지 병합)
  const row: any[] = [
    { content: '', rowSpan: 2, styles: { fillColor: HEADER_BG } },
  ];

  dateGroups.forEach((dateGroup) => {
    const colSpan = dateGroup.schedules.length;
    // 날짜 셀 (같은 날 미사가 여러 개면 colSpan 적용)
    row.push({
      content: dateGroup.dateLabel,
      colSpan: colSpan > 1 ? colSpan : undefined,
      styles: {
        fillColor: HEADER_BG,
        halign: 'center' as const,
        valign: 'middle' as const,
        fontSize: 10,
        fontStyle: 'normal' as const,
      },
    });
    // colSpan 빈 셀 추가 (autoTable 내부 처리용)
    for (let i = 1; i < colSpan; i++) {
      row.push('');
    }
  });

  return row;
}

/**
 * 헤더 2행: 시간
 * 예: ['', '오전10시', '오후6시', '오전7시', ...]
 */
function buildTimeHeaderRow(columnMetas: ColumnMeta[]): any[] {
  // 첫 번째 셀은 rowSpan=2로 이미 병합됨 → 빈 셀
  const row: any[] = [''];

  columnMetas.forEach((meta) => {
    row.push({
      content: meta.timeLabel,
      styles: {
        fillColor: HEADER_BG,
        halign: 'center' as const,
        fontSize: 8,
        fontStyle: 'normal' as const,
      },
    });
  });

  return row;
}

/**
 * Body 행 생성: 제의색상 행 + 역할별 봉사자 행
 * 역할 라벨 셀에는 해당 역할의 hex color를 배경색으로 적용
 */
function buildBodyRows(
  columnMetas: ColumnMeta[],
  roles: Array<{ id: string; name: string; color: string }>
): any[][] {
  const bodyRows: any[][] = [];

  // ─── 제의색상 행 ───
  const vestmentRow: any[] = [
    { content: '제의색상', styles: { fillColor: HEADER_BG, halign: 'center' as const, fontSize: 9 } },
  ];
  columnMetas.forEach((meta) => {
    const vestmentColor = meta.schedule.massTemplate?.vestmentColor;
    vestmentRow.push({
      content: vestmentColor ? vestmentColorLabels[vestmentColor] || '' : '',
      styles: { halign: 'center' as const, fontSize: 8 },
    });
  });
  bodyRows.push(vestmentRow);

  // ─── 역할별 행 ───
  roles.forEach((role) => {
    const roleRow: any[] = [
      // 역할 라벨 (역할 색상 배경 + 흰색 텍스트)
      {
        content: role.name,
        styles: {
          fillColor: hexToRgb(role.color),
          textColor: [255, 255, 255] as [number, number, number],
          halign: 'center' as const,
          fontSize: 9,
          fontStyle: 'normal' as const,
        },
      },
    ];

    // 각 컬럼(일정)별 봉사자 셀
    columnMetas.forEach((meta) => {
      const schedule = meta.schedule;

      // 해당 역할에 배정된 봉사자들
      const assignedVolunteers = schedule.assignments
        .filter((a) => a.volunteerRoleId === role.id)
        .map((a) => formatVolunteerName(a.user));

      // 해당 역할 슬롯이 있는지 확인
      const hasSlot = schedule.massTemplate?.slots.some(
        (s) => s.volunteerRole.id === role.id
      );

      if (!hasSlot) {
        // 슬롯 없음 → 회색 배경 "-"
        roleRow.push({
          content: '-',
          styles: { halign: 'center' as const, fillColor: NO_SLOT_BG, textColor: GRAY_TEXT, fontSize: 8 },
        });
      } else if (assignedVolunteers.length === 0) {
        // 미배정 → 빨간색 텍스트
        roleRow.push({
          content: '(미배정)',
          styles: { halign: 'center' as const, textColor: RED, fontSize: 8 },
        });
      } else {
        // 봉사자 이름 (줄바꿈으로 구분)
        roleRow.push({
          content: assignedVolunteers.join('\n'),
          styles: { halign: 'center' as const, fontSize: 8 },
        });
      }
    });

    bodyRows.push(roleRow);
  });

  return bodyRows;
}

// ─── 메인 PDF 생성 함수 ───

/**
 * 배정표 PDF 내부 생성 (jsPDF 인스턴스 반환)
 * 다운로드와 Blob 생성 모두에서 재사용
 */
async function buildAssignmentPdf(
  schedules: ScheduleForPdf[],
  year: number,
  month: number
): Promise<jsPDF> {
  // 1. jsPDF 인스턴스 생성 (A4 가로)
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  // 2. 한글 폰트 등록
  await registerKoreanFont(doc);

  const pageWidth = doc.internal.pageSize.getWidth();

  // 3. 결재란 (우측 상단, rowSpan으로 "결재" 합치기)
  autoTable(doc, {
    startY: 8,
    margin: { left: pageWidth - 85 },
    tableWidth: 75,
    // head/body 분리 대신 body만 사용 (rowSpan 적용)
    body: [
      // 1행: "결재" (rowSpan=2) + 라벨들
      [
        {
          content: '결재',
          rowSpan: 2,
          styles: {
            halign: 'center' as const,
            valign: 'middle' as const,
            fillColor: APPROVAL_BG,
            fontSize: 9,
            fontStyle: 'normal' as const,
          },
        },
        { content: '작성자', styles: { halign: 'center' as const, fillColor: APPROVAL_BG, minCellHeight: 6 } },
        { content: '수녀님', styles: { halign: 'center' as const, fillColor: APPROVAL_BG, minCellHeight: 6 } },
        { content: '신부님', styles: { halign: 'center' as const, fillColor: APPROVAL_BG, minCellHeight: 6 } },
      ],
      // 2행: 서명 공간 (결재 셀은 rowSpan으로 병합됨)
      [
        { content: '', styles: { minCellHeight: 18 } },
        { content: '', styles: { minCellHeight: 18 } },
        { content: '', styles: { minCellHeight: 18 } },
      ],
    ],
    theme: 'grid',
    styles: {
      font: 'NotoSansKR',
      fontSize: 8,
      cellPadding: 2,
      lineColor: [51, 51, 51],
      lineWidth: 0.3,
      fontStyle: 'normal' as const,
    },
    columnStyles: {
      0: { cellWidth: 14 },  // '결재' 컬럼
      1: { cellWidth: 20 },  // '작성자'
      2: { cellWidth: 20 },  // '수녀님'
      3: { cellWidth: 20 },  // '신부님'
    },
  });

  // 4. 결재란 끝 Y좌표 (겹침 방지용)
  const approvalFinalY = (doc as any).lastAutoTable.finalY;

  // 5. 제목
  doc.setFontSize(18);
  doc.setTextColor(17, 17, 17);
  doc.text(`${year}년 ${month}월 봉사자 배정표`, pageWidth / 2, 20, { align: 'center' });

  // 6. 데이터 준비 (전치 레이아웃용)
  const dateGroups = groupSchedulesByDate(schedules);
  const columnMetas = buildColumnMetas(dateGroups);
  const roles = extractUniqueRoles(schedules);

  // 7. 헤더 행 생성 (2행: 날짜 + 시간)
  const dateHeaderRow = buildDateHeaderRow(dateGroups);
  const timeHeaderRow = buildTimeHeaderRow(columnMetas);

  // 8. Body 행 생성 (제의색상 + 역할별)
  const bodyRows = buildBodyRows(columnMetas, roles);

  // 9. 메인 테이블 startY (결재란과 겹치지 않게)
  const mainTableStartY = Math.max(28, approvalFinalY + 3);

  // 10. 메인 테이블 autoTable 호출
  autoTable(doc, {
    startY: mainTableStartY,
    head: [dateHeaderRow, timeHeaderRow],
    body: bodyRows,
    theme: 'grid',
    styles: {
      font: 'NotoSansKR',
      fontSize: 9,
      cellPadding: 2,
      lineColor: [51, 51, 51],
      lineWidth: 0.3,
      overflow: 'linebreak',
      fontStyle: 'normal' as const,
    },
    headStyles: {
      fillColor: HEADER_BG,
      textColor: [0, 0, 0],
      fontStyle: 'normal' as const,
      halign: 'center',
      fontSize: 9,
    },
    // 첫 번째 컬럼(라벨) 고정 너비
    columnStyles: {
      0: { cellWidth: 22 },
    },
    didParseCell: (data) => {
      // ─── 일요일/특전미사 굵은 테두리 ───
      // 데이터 컬럼(index >= 1)에 대해 massType 확인
      if (data.column.index >= 1) {
        const metaIndex = data.column.index - 1;
        if (metaIndex < columnMetas.length) {
          const meta = columnMetas[metaIndex];
          if (meta.isSundayOrSpecial) {
            // 상하좌우 모두 굵은 테두리 (기본 0.3 → 0.8)
            data.cell.styles.lineWidth = {
              top: 0.8,
              bottom: 0.8,
              left: 0.8,
              right: 0.8,
            };
          }
        }
      }
    },
    // 매 페이지 헤더 반복
    showHead: 'everyPage',
    // 가로 페이지 넘김 (컬럼이 많을 때)
    horizontalPageBreak: true,
    // 첫 번째 컬럼(라벨)을 페이지마다 반복
    horizontalPageBreakRepeat: 0,
  });

  // 11. 하단 생성일
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setTextColor(136, 136, 136);
  doc.text(`생성일: ${new Date().toLocaleDateString('ko-KR')}`, pageWidth - 10, pageHeight - 8, { align: 'right' });

  return doc;
}

/**
 * 봉사자 배정표 PDF 생성 및 다운로드
 * @param schedules 일정 배열
 * @param year 연도
 * @param month 월
 */
export async function generateAssignmentPdf(
  schedules: ScheduleForPdf[],
  year: number,
  month: number
): Promise<void> {
  // 일정이 없으면 안내
  if (schedules.length === 0) {
    alert('이번 달 일정이 없습니다.');
    return;
  }

  try {
    const doc = await buildAssignmentPdf(schedules, year, month);
    // PDF 파일 다운로드
    doc.save(`${year}년_${month}월_봉사자_배정표.pdf`);
  } catch (err) {
    console.error('[PDF] 배정표 PDF 생성 실패:', err);
    alert(`PDF 생성에 실패했습니다.\n${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * 봉사자 배정표 PDF를 Blob으로 반환 (이메일 전송용)
 * @param schedules 일정 배열
 * @param year 연도
 * @param month 월
 * @returns PDF Blob
 */
export async function generateAssignmentPdfBlob(
  schedules: ScheduleForPdf[],
  year: number,
  month: number
): Promise<Blob> {
  const doc = await buildAssignmentPdf(schedules, year, month);
  return doc.output('blob');
}
