/**
 * 봉사자 배정표 PDF 생성 유틸리티
 * jspdf + jspdf-autotable로 직접 테이블 PDF 생성 (html2canvas 불필요)
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

  // 3. 결재란 (우측 상단)
  const pageWidth = doc.internal.pageSize.getWidth();
  autoTable(doc, {
    startY: 8,
    margin: { left: pageWidth - 85 },
    tableWidth: 75,
    head: [['결재', '작성자', '수녀님', '신부님']],
    body: [['', '', '', '']],
    theme: 'grid',
    styles: {
      font: 'NotoSansKR',
      fontSize: 8,
      cellPadding: 2,
      lineColor: [51, 51, 51],
      lineWidth: 0.3,
    },
    headStyles: {
      fillColor: APPROVAL_BG,
      textColor: [0, 0, 0],
      fontStyle: 'normal',
      halign: 'center',
      minCellHeight: 6,
    },
    bodyStyles: {
      minCellHeight: 18,
    },
    columnStyles: {
      0: { cellWidth: 14 },
      1: { cellWidth: 20 },
      2: { cellWidth: 20 },
      3: { cellWidth: 20 },
    },
  });

  // 4. 제목
  doc.setFontSize(18);
  doc.setTextColor(17, 17, 17);
  doc.text(`${year}년 ${month}월 봉사자 배정표`, pageWidth / 2, 20, { align: 'center' });

  // 5. 고유 역할 목록 추출
  const roles = extractUniqueRoles(schedules);

  // 6. 메인 테이블 헤더 구성 (날짜, 시간, 제의색상, ...역할명들)
  const headRow = ['날짜', '시간', '제의색상', ...roles.map((r) => r.name)];

  // 7. 메인 테이블 body 구성
  const body: any[][] = schedules.map((schedule) => {
    // 기본 컬럼: 날짜, 시간, 제의색상
    const row: any[] = [
      { content: formatDateShort(schedule.date), styles: { halign: 'center' as const, fontStyle: 'bold' as const } },
      { content: formatTime12Hour(schedule.time), styles: { halign: 'center' as const, fontSize: 8 } },
      {
        content: schedule.massTemplate?.vestmentColor
          ? vestmentColorLabels[schedule.massTemplate.vestmentColor] || ''
          : '',
        styles: { halign: 'center' as const, fontSize: 8 },
      },
    ];

    // 각 역할별 봉사자 셀
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

    return row;
  });

  // 8. autoTable 호출
  autoTable(doc, {
    startY: 28,
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
    },
    headStyles: {
      fillColor: HEADER_BG,
      textColor: [0, 0, 0],
      fontStyle: 'normal',
      halign: 'center',
      fontSize: 9,
    },
    // 컬럼별 스타일 (기본 3개 + 역할별)
    columnStyles: {
      0: { cellWidth: 22 },  // 날짜
      1: { cellWidth: 24 },  // 시간
      2: { cellWidth: 18 },  // 제의색상
    },
    // 역할 헤더에 각 역할의 color를 배경색으로 적용
    didParseCell: (data) => {
      if (data.section === 'head' && data.column.index >= 3) {
        // 역할 인덱스 (0부터)
        const roleIndex = data.column.index - 3;
        if (roleIndex < roles.length) {
          const roleColor = hexToRgb(roles[roleIndex].color);
          data.cell.styles.fillColor = roleColor;
          data.cell.styles.textColor = [255, 255, 255];
        }
      }
    },
    // 매 페이지 헤더 반복
    showHead: 'everyPage',
  });

  // 9. 하단 생성일
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
