/**
 * 봉사자 배정표 PDF 생성 유틸리티
 * html2canvas로 HTML을 캡처한 후 jspdf로 PDF 변환하여 다운로드
 */
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
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

  // 1. 숨겨진 div 생성 (html2canvas가 캡처할 수 있도록 absolute 위치)
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = `${window.scrollY}px`;
  container.style.zIndex = '-1';
  container.innerHTML = buildAssignmentSheetHtml(schedules, year, month);
  document.body.appendChild(container);

  try {
    // 브라우저 렌더링 대기
    await new Promise((resolve) => setTimeout(resolve, 100));

    // 2. html2canvas로 캡처 (2배 스케일로 고화질)
    const target = container.firstElementChild as HTMLElement;
    const canvas = await html2canvas(target, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: target.scrollWidth,
      height: target.scrollHeight,
    });

    // 3. jsPDF로 PDF 생성 (A4 가로)
    const pdf = new jsPDF({
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

    // 이미지가 한 페이지보다 길면 여러 페이지로 분할
    const imgData = canvas.toDataURL('image/png');

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

        // 현재 페이지에 표시할 영역의 높이
        const currentPageHeight = Math.min(remainingHeight, pageHeight - margin * 2);

        // 이미지의 일부분만 클리핑하여 표시
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
  } finally {
    // 5. 임시 div 정리
    document.body.removeChild(container);
  }
}
