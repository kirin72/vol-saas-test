/**
 * 봉사자 배정표 PDF 생성 유틸리티
 * html2canvas로 HTML을 캡처한 후 jspdf로 PDF 변환하여 다운로드
 */
import { vestmentColorLabels, vestmentColorCodes } from '@/lib/validations/template';

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

// HTML 결재란 생성
const buildApprovalSection = () => {
  return `
    <div style="display: flex; justify-content: flex-end; margin-bottom: 20px;">
      <table style="border-collapse: collapse; border: 2px solid #333;">
        <tr>
          <td style="border: 1px solid #333; padding: 6px 12px; background-color: #f5f5f5; font-weight: bold; font-size: 12px; text-align: center; width: 50px;">
            결재
          </td>
          <td style="border: 1px solid #333; padding: 6px 12px; background-color: #f5f5f5; font-weight: bold; font-size: 12px; text-align: center; width: 70px;">
            작성자
          </td>
          <td style="border: 1px solid #333; padding: 6px 12px; background-color: #f5f5f5; font-weight: bold; font-size: 12px; text-align: center; width: 70px;">
            수녀님
          </td>
          <td style="border: 1px solid #333; padding: 6px 12px; background-color: #f5f5f5; font-weight: bold; font-size: 12px; text-align: center; width: 70px;">
            신부님
          </td>
        </tr>
        <tr>
          <td style="border: 1px solid #333; height: 60px; width: 50px;"></td>
          <td style="border: 1px solid #333; height: 60px; width: 70px;"></td>
          <td style="border: 1px solid #333; height: 60px; width: 70px;"></td>
          <td style="border: 1px solid #333; height: 60px; width: 70px;"></td>
        </tr>
      </table>
    </div>
  `;
};

// HTML 제의 색상 셀 내용 생성
const buildVestmentColorCell = (vestmentColor: string | null) => {
  if (!vestmentColor) return '';

  const colorCode = vestmentColorCodes[vestmentColor] || '#ccc';
  const label = vestmentColorLabels[vestmentColor] || '';
  // 백색인 경우 테두리 추가
  const borderStyle = vestmentColor === 'WHITE' ? 'border: 1px solid #ccc;' : '';

  return `
    <div style="display: flex; align-items: center; gap: 4px; justify-content: center;">
      <span style="
        display: inline-block;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background-color: ${colorCode};
        ${borderStyle}
        flex-shrink: 0;
      "></span>
      <span style="font-size: 11px;">${label}</span>
    </div>
  `;
};

// 봉사자 이름 포맷 (세례명 포함)
const formatVolunteerName = (user: { name: string; baptismalName: string | null }) => {
  if (user.baptismalName) {
    return `${user.name}(${user.baptismalName})`;
  }
  return user.name;
};

// 배정표 HTML 전체 생성
const buildAssignmentSheetHtml = (
  schedules: ScheduleForPdf[],
  year: number,
  month: number
) => {
  // 전체 일정에서 고유 역할 추출
  const roles = extractUniqueRoles(schedules);

  // 역할 컬럼 헤더 생성
  const roleHeaders = roles
    .map(
      (role) => `
      <th style="
        border: 1px solid #333;
        padding: 8px 6px;
        background-color: ${role.color};
        color: white;
        font-size: 12px;
        text-align: center;
        min-width: 80px;
        font-weight: bold;
      ">
        ${role.name}
      </th>
    `
    )
    .join('');

  // 테이블 행 생성
  const rows = schedules
    .map((schedule) => {
      // 각 역할별 배정된 봉사자 목록
      const roleCells = roles
        .map((role) => {
          // 이 일정에서 해당 역할에 배정된 봉사자들
          const assignedVolunteers = schedule.assignments
            .filter((a) => a.volunteerRoleId === role.id)
            .map((a) => formatVolunteerName(a.user));

          // 이 일정에 해당 역할 슬롯이 있는지 확인
          const hasSlot = schedule.massTemplate?.slots.some(
            (s) => s.volunteerRole.id === role.id
          );

          // 슬롯이 없는 역할은 회색 배경
          if (!hasSlot) {
            return `<td style="border: 1px solid #333; padding: 4px 6px; text-align: center; background-color: #f0f0f0; font-size: 11px; color: #999;">-</td>`;
          }

          // 미배정 표시
          if (assignedVolunteers.length === 0) {
            return `<td style="border: 1px solid #333; padding: 4px 6px; text-align: center; font-size: 11px; color: #cc0000;">(미배정)</td>`;
          }

          return `<td style="border: 1px solid #333; padding: 4px 6px; text-align: center; font-size: 11px;">${assignedVolunteers.join('<br/>')}</td>`;
        })
        .join('');

      // 제의 색상 셀
      const vestmentColor = schedule.massTemplate?.vestmentColor || null;

      return `
        <tr>
          <td style="border: 1px solid #333; padding: 6px 8px; text-align: center; font-size: 12px; font-weight: 500; white-space: nowrap;">
            ${formatDateShort(schedule.date)}
          </td>
          <td style="border: 1px solid #333; padding: 6px 8px; text-align: center; font-size: 11px; white-space: nowrap;">
            ${formatTime12Hour(schedule.time)}
          </td>
          <td style="border: 1px solid #333; padding: 4px 6px; text-align: center;">
            ${buildVestmentColorCell(vestmentColor)}
          </td>
          ${roleCells}
        </tr>
      `;
    })
    .join('');

  // 전체 HTML 조합
  return `
    <div style="
      font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif;
      padding: 30px;
      background: white;
      width: 1100px;
      box-sizing: border-box;
    ">
      <!-- 결재란 -->
      ${buildApprovalSection()}

      <!-- 제목 -->
      <h1 style="
        text-align: center;
        font-size: 24px;
        font-weight: bold;
        margin-bottom: 24px;
        color: #111;
      ">
        ${year}년 ${month}월 봉사자 배정표
      </h1>

      <!-- 배정 테이블 -->
      <table style="width: 100%; border-collapse: collapse; border: 2px solid #333;">
        <thead>
          <tr>
            <th style="border: 1px solid #333; padding: 8px 6px; background-color: #e8e8e8; font-size: 12px; text-align: center; min-width: 80px; font-weight: bold;">
              날짜
            </th>
            <th style="border: 1px solid #333; padding: 8px 6px; background-color: #e8e8e8; font-size: 12px; text-align: center; min-width: 70px; font-weight: bold;">
              시간
            </th>
            <th style="border: 1px solid #333; padding: 8px 6px; background-color: #e8e8e8; font-size: 12px; text-align: center; min-width: 70px; font-weight: bold;">
              제의색상
            </th>
            ${roleHeaders}
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>

      <!-- 하단 메모 -->
      <div style="margin-top: 16px; text-align: right; font-size: 10px; color: #888;">
        생성일: ${new Date().toLocaleDateString('ko-KR')}
      </div>
    </div>
  `;
};

/**
 * html2canvas 모듈 동적 로드
 * webpack/turbopack의 ESM/CJS 호환성 차이를 자동 처리
 */
async function loadHtml2Canvas(): Promise<(element: HTMLElement, options?: object) => Promise<HTMLCanvasElement>> {
  const mod = await import('html2canvas');
  // ESM default export 또는 CJS module.exports 대응
  const fn = typeof mod.default === 'function'
    ? mod.default
    : typeof mod === 'function'
      ? (mod as any)
      : (mod as any).default?.default;
  if (typeof fn !== 'function') {
    throw new Error(
      `html2canvas 모듈 로드 실패: default=${typeof mod.default}, mod=${typeof mod}, keys=${Object.keys(mod).join(',')}`
    );
  }
  return fn as (element: HTMLElement, options?: object) => Promise<HTMLCanvasElement>;
}

/**
 * jsPDF 생성자 동적 로드
 * webpack/turbopack의 ESM/CJS 호환성 차이를 자동 처리
 */
async function loadJsPDF(): Promise<any> {
  const mod = await import('jspdf');
  // named export 'jsPDF' 또는 default export 대응
  const JsPDF = (mod as any).jsPDF
    || (typeof mod.default === 'function' ? mod.default : null)
    || (mod as any).default?.jsPDF;
  if (typeof JsPDF !== 'function') {
    throw new Error(
      `jsPDF 모듈 로드 실패: jsPDF=${typeof (mod as any).jsPDF}, default=${typeof mod.default}, keys=${Object.keys(mod).join(',')}`
    );
  }
  return JsPDF;
}

/**
 * 인쇄 다이얼로그 폴백
 * html2canvas/jspdf 실패 시 새 창에서 인쇄 다이얼로그를 띄움
 */
function printFallback(html: string, title: string): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('팝업이 차단되었습니다. 팝업 차단을 해제한 후 다시 시도해주세요.');
    return;
  }
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>${title}</title>
      <style>
        @media print {
          @page { size: landscape A4; margin: 10mm; }
          body { margin: 0; }
        }
      </style>
    </head>
    <body>${html}</body>
    </html>
  `);
  printWindow.document.close();
  // 렌더링 완료 후 인쇄 다이얼로그 표시
  printWindow.onload = () => {
    printWindow.print();
  };
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

  // HTML 미리 생성 (PDF 실패 시 인쇄 폴백에서도 사용)
  const sheetHtml = buildAssignmentSheetHtml(schedules, year, month);

  // 0. 라이브러리 동적 로드
  let html2canvas: (element: HTMLElement, options?: object) => Promise<HTMLCanvasElement>;
  let JsPDF: any;

  try {
    html2canvas = await loadHtml2Canvas();
  } catch (err) {
    console.error('[PDF] html2canvas 로드 실패, 인쇄 폴백 사용:', err);
    printFallback(sheetHtml, `${year}년 ${month}월 봉사자 배정표`);
    return;
  }

  try {
    JsPDF = await loadJsPDF();
  } catch (err) {
    console.error('[PDF] jsPDF 로드 실패, 인쇄 폴백 사용:', err);
    printFallback(sheetHtml, `${year}년 ${month}월 봉사자 배정표`);
    return;
  }

  // 1. 숨겨진 div 생성
  //    off-screen 배치 (opacity:0은 html2canvas가 빈 이미지로 캡처할 수 있음)
  const container = document.createElement('div');
  container.style.cssText = `
    position: absolute;
    left: -9999px;
    top: 0;
    width: 1200px;
    background: white;
  `;
  container.innerHTML = sheetHtml;
  document.body.appendChild(container);

  try {
    // 브라우저 레이아웃 + 페인트 완료 대기
    await new Promise((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTimeout(() => resolve(undefined), 100);
        });
      });
    });

    // 2. html2canvas로 캡처
    const target = container.firstElementChild as HTMLElement;
    if (!target) {
      throw new Error('캡처 대상 요소를 찾을 수 없습니다.');
    }

    // 요소 크기 확인
    const rect = target.getBoundingClientRect();
    console.log('[PDF] 캡처 대상 크기:', { width: rect.width, height: rect.height, scrollW: target.scrollWidth, scrollH: target.scrollHeight });
    if (rect.width === 0 || rect.height === 0) {
      throw new Error(`요소 크기가 0입니다: ${rect.width}x${rect.height}`);
    }

    let canvas: HTMLCanvasElement;
    try {
      canvas = await html2canvas(target, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });
    } catch (err) {
      throw new Error(`html2canvas 캡처 실패: ${err instanceof Error ? err.message : err}`);
    }

    // 캔버스 크기 확인
    console.log('[PDF] 캔버스 크기:', { width: canvas.width, height: canvas.height });
    if (canvas.width === 0 || canvas.height === 0) {
      throw new Error(`캔버스 크기가 0입니다: ${canvas.width}x${canvas.height}`);
    }

    // 3. jsPDF로 PDF 생성 (A4 가로)
    const pdf = new JsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    // A4 가로 크기: 297mm x 210mm
    const pageWidth = 297;
    const pageHeight = 210;
    const margin = 10;
    const contentWidth = pageWidth - margin * 2;

    // 캡처 이미지의 비율 계산
    const imgWidth = contentWidth;
    const imgHeight = (canvas.height * contentWidth) / canvas.width;

    // 캔버스를 PNG 데이터 URL로 변환
    const imgData = canvas.toDataURL('image/png');

    // PDF에 이미지 삽입
    if (imgHeight <= pageHeight - margin * 2) {
      // 한 페이지에 들어가는 경우
      pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight);
    } else {
      // 여러 페이지로 분할
      let remainingHeight = imgHeight;
      let position = 0;

      while (remainingHeight > 0) {
        if (position > 0) {
          pdf.addPage();
        }

        pdf.addImage(
          imgData,
          'PNG',
          margin,
          margin - position,
          imgWidth,
          imgHeight
        );

        position += pageHeight - margin * 2;
        remainingHeight -= pageHeight - margin * 2;
      }
    }

    // 4. PDF 다운로드
    pdf.save(`${year}년_${month}월_봉사자_배정표.pdf`);
  } catch (err) {
    // PDF 생성 실패 시 인쇄 폴백 사용
    console.error('[PDF] PDF 생성 실패, 인쇄 폴백 사용:', err);
    const message = err instanceof Error ? err.message : String(err);
    const usePrint = confirm(
      `PDF 자동 다운로드에 실패했습니다.\n(${message})\n\n인쇄 다이얼로그를 통해 PDF로 저장하시겠습니까?\n(인쇄 다이얼로그에서 "PDF로 저장"을 선택해 주세요)`
    );
    if (usePrint) {
      printFallback(sheetHtml, `${year}년 ${month}월 봉사자 배정표`);
    }
  } finally {
    // 5. 임시 div 정리
    if (container.parentNode) {
      document.body.removeChild(container);
    }
  }
}
