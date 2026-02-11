/**
 * 봉사자 배정표 PDF 생성 유틸리티
 * jspdf + jspdf-autotable로 직접 테이블 PDF 생성
 * 기본 레이아웃: 날짜가 왼쪽(행), 역할이 오른쪽(컬럼)
 */
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { registerKoreanFont } from '@/lib/pdf/load-korean-font';

// 배정 데이터 타입 (assignments 페이지의 MassSchedule과 동일)
interface ScheduleForPdf {
  id: string;
  date: string;
  time: string;
  notes: string | null;
  massTemplate: {
    id: string;
    massType: string;
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

/**
 * 날짜별 그룹화 (같은 날짜 rowSpan 병합용)
 * 같은 날짜의 일정들을 묶어 rowSpan 계산에 사용
 */
function groupSchedulesByDate(schedules: ScheduleForPdf[]) {
  const groups: { date: string; schedules: ScheduleForPdf[] }[] = [];
  let currentDate = '';
  let currentGroup: ScheduleForPdf[] = [];

  // 이미 날짜순 정렬되어 있다고 가정
  schedules.forEach((schedule) => {
    if (schedule.date !== currentDate) {
      if (currentGroup.length > 0) {
        groups.push({ date: currentDate, schedules: currentGroup });
      }
      currentDate = schedule.date;
      currentGroup = [schedule];
    } else {
      currentGroup.push(schedule);
    }
  });
  // 마지막 그룹 추가
  if (currentGroup.length > 0) {
    groups.push({ date: currentDate, schedules: currentGroup });
  }

  return groups;
}

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

  // 6. 고유 역할 목록 추출
  const roles = extractUniqueRoles(schedules);

  // 7. 메인 테이블 헤더 구성 (날짜, 시간, ...역할명들)
  const headRow = ['날짜', '시간', ...roles.map((r) => r.name)];

  // 8. 날짜별 그룹화 (같은 날짜 rowSpan 병합용)
  const dateGroups = groupSchedulesByDate(schedules);

  // 9. 각 일정의 massType 기록 (일요일/특전미사 굵은 테두리용)
  const rowMassTypes: string[] = [];
  schedules.forEach((schedule) => {
    rowMassTypes.push(schedule.massTemplate?.massType || 'WEEKDAY');
  });

  // 10. 메인 테이블 body 구성 (같은 날짜 rowSpan 적용)
  const body: any[][] = [];
  let globalRowIndex = 0;

  dateGroups.forEach((group) => {
    group.schedules.forEach((schedule, indexInGroup) => {
      const row: any[] = [];

      // ─── 날짜 셀 (같은 날짜 첫 번째 행에만 rowSpan 적용) ───
      if (indexInGroup === 0) {
        row.push({
          content: formatDateShort(schedule.date),
          rowSpan: group.schedules.length > 1 ? group.schedules.length : undefined,
          styles: {
            halign: 'center' as const,
            valign: 'middle' as const,
            fontSize: 10,
            fontStyle: 'normal' as const,
          },
        });
      }
      // rowSpan으로 병합된 행에서는 날짜 셀 생략 (autoTable이 자동 처리)

      // ─── 시간 셀 ───
      row.push({
        content: formatTime12Hour(schedule.time),
        styles: { halign: 'center' as const, fontSize: 8 },
      });

      // ─── 각 역할별 봉사자 셀 ───
      roles.forEach((role) => {
        // 이 일정에서 해당 역할에 배정된 봉사자들
        const assignedVolunteers = schedule.assignments
          .filter((a) => a.volunteerRoleId === role.id)
          .map((a) => formatVolunteerName(a.user));

        // 이 일정에 해당 역할 슬롯이 있는지 확인
        const hasSlot = schedule.massTemplate?.slots.some(
          (s) => s.volunteerRole.id === role.id
        );

        if (!hasSlot) {
          // 슬롯 없음 → 회색 배경 "-"
          row.push({
            content: '-',
            styles: { halign: 'center' as const, fillColor: NO_SLOT_BG, textColor: GRAY_TEXT },
          });
        } else if (assignedVolunteers.length === 0) {
          // 미배정 → 빨간색 텍스트
          row.push({
            content: '(미배정)',
            styles: { halign: 'center' as const, textColor: RED, fontSize: 8 },
          });
        } else {
          // 봉사자 이름 (줄바꿈으로 구분)
          row.push({
            content: assignedVolunteers.join('\n'),
            styles: { halign: 'center' as const, fontSize: 8 },
          });
        }
      });

      body.push(row);
      globalRowIndex++;
    });
  });

  // 11. 메인 테이블 startY (결재란과 겹치지 않게)
  const mainTableStartY = Math.max(28, approvalFinalY + 3);

  // 12. autoTable 호출
  autoTable(doc, {
    startY: mainTableStartY,
    head: [headRow],
    body: body,
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
    // 컬럼별 스타일 (기본 2개 + 역할별)
    columnStyles: {
      0: { cellWidth: 22 },  // 날짜
      1: { cellWidth: 24 },  // 시간
    },
    didParseCell: (data) => {
      // ─── 역할 헤더에 각 역할의 color를 배경색으로 적용 ───
      if (data.section === 'head' && data.column.index >= 2) {
        const roleIndex = data.column.index - 2;
        if (roleIndex < roles.length) {
          const roleColor = hexToRgb(roles[roleIndex].color);
          data.cell.styles.fillColor = roleColor;
          data.cell.styles.textColor = [255, 255, 255];
        }
      }

      // ─── 일요일/특전미사 행 굵은 테두리 ───
      if (data.section === 'body') {
        const rowIdx = data.row.index;
        if (rowIdx < rowMassTypes.length) {
          const massType = rowMassTypes[rowIdx];
          if (massType === 'SUNDAY' || massType === 'SPECIAL') {
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
  });

  // 13. 하단 생성일
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
