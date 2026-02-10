/**
 * 입출금내역 PDF 생성 유틸리티
 * html2canvas로 HTML을 캡처한 후 jspdf로 PDF 변환하여 다운로드
 */
import type { Transaction, MonthlyFinanceSummary } from '@/types/finance';

// 날짜 포맷 (예: "02/01 (일)")
const formatDate = (date: Date) => {
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  const weekday = weekdays[d.getDay()];
  return `${month}/${day} (${weekday})`;
};

// 금액 포맷 (예: "1,000원")
const formatAmount = (amount: number) => {
  return amount.toLocaleString('ko-KR') + '원';
};

// 입출금내역 HTML 전체 생성
const buildFinanceSheetHtml = (
  transactions: Transaction[],
  summary: MonthlyFinanceSummary,
  year: number,
  month: number
) => {
  const { balanceForward, totalIncome, totalExpense, balance } = summary;

  // 이월금 행 생성 (이월금이 0이 아닐 때)
  const balanceForwardRow = balanceForward !== 0
    ? `
      <tr style="background-color: #f8f9fa;">
        <td style="border: 1px solid #333; padding: 8px 10px; text-align: center; font-size: 12px;">
          ${String(month).padStart(2, '0')}/01
        </td>
        <td style="border: 1px solid #333; padding: 8px 10px; text-align: right; font-size: 12px; color: #2563eb; font-weight: 600;">
          ${formatAmount(balanceForward)}
        </td>
        <td style="border: 1px solid #333; padding: 8px 10px; text-align: center; font-size: 12px; color: #999;">
          -
        </td>
        <td style="border: 1px solid #333; padding: 8px 10px; font-size: 12px; color: #555;">
          전월 이월
        </td>
      </tr>
    `
    : '';

  // 거래 내역 행 생성
  const transactionRows = transactions
    .map((tx) => {
      const isIncome = tx.type === 'income';
      const incomeCell = isIncome
        ? `<span style="color: #2563eb; font-weight: 600;">${formatAmount(tx.amount)}</span>`
        : '<span style="color: #999;">-</span>';
      const expenseCell = !isIncome
        ? `<span style="color: #dc2626; font-weight: 600;">${formatAmount(tx.amount)}</span>`
        : '<span style="color: #999;">-</span>';
      const userInfo = tx.user ? ` (${tx.user.name})` : '';

      return `
        <tr>
          <td style="border: 1px solid #333; padding: 8px 10px; text-align: center; font-size: 12px;">
            ${formatDate(tx.date)}
          </td>
          <td style="border: 1px solid #333; padding: 8px 10px; text-align: right; font-size: 12px;">
            ${incomeCell}
          </td>
          <td style="border: 1px solid #333; padding: 8px 10px; text-align: right; font-size: 12px;">
            ${expenseCell}
          </td>
          <td style="border: 1px solid #333; padding: 8px 10px; font-size: 12px;">
            ${tx.description}${userInfo}
          </td>
        </tr>
      `;
    })
    .join('');

  // 합계 행
  const summaryRows = `
    <tr style="background-color: #f0f4ff; font-weight: bold;">
      <td style="border: 1px solid #333; padding: 10px; text-align: center; font-size: 12px;">
        합계
      </td>
      <td style="border: 1px solid #333; padding: 10px; text-align: right; font-size: 12px; color: #2563eb;">
        ${formatAmount(totalIncome)}
      </td>
      <td style="border: 1px solid #333; padding: 10px; text-align: right; font-size: 12px; color: #dc2626;">
        ${formatAmount(totalExpense)}
      </td>
      <td style="border: 1px solid #333; padding: 10px; font-size: 12px;">
      </td>
    </tr>
    <tr style="background-color: #e8f5e9; font-weight: bold;">
      <td colspan="3" style="border: 1px solid #333; padding: 10px; text-align: right; font-size: 13px;">
        잔액 (이월 + 수입 - 지출)
      </td>
      <td style="border: 1px solid #333; padding: 10px; text-align: right; font-size: 14px; color: ${balance >= 0 ? '#16a34a' : '#dc2626'}; font-weight: bold;">
        ${formatAmount(balance)}
      </td>
    </tr>
  `;

  // 전체 HTML 조합 (결재란 없음)
  return `
    <div style="
      font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif;
      padding: 30px;
      background: white;
      width: 800px;
      box-sizing: border-box;
    ">
      <!-- 제목 -->
      <h1 style="
        text-align: center;
        font-size: 24px;
        font-weight: bold;
        margin-bottom: 24px;
        color: #111;
      ">
        ${year}년 ${month}월 입출금내역
      </h1>

      <!-- 입출금 테이블 -->
      <table style="width: 100%; border-collapse: collapse; border: 2px solid #333;">
        <thead>
          <tr>
            <th style="border: 1px solid #333; padding: 10px 8px; background-color: #e8e8e8; font-size: 12px; text-align: center; width: 120px; font-weight: bold;">
              날짜
            </th>
            <th style="border: 1px solid #333; padding: 10px 8px; background-color: #e8e8e8; font-size: 12px; text-align: center; width: 140px; font-weight: bold;">
              수입
            </th>
            <th style="border: 1px solid #333; padding: 10px 8px; background-color: #e8e8e8; font-size: 12px; text-align: center; width: 140px; font-weight: bold;">
              지출
            </th>
            <th style="border: 1px solid #333; padding: 10px 8px; background-color: #e8e8e8; font-size: 12px; text-align: center; font-weight: bold;">
              적요
            </th>
          </tr>
        </thead>
        <tbody>
          ${balanceForwardRow}
          ${transactionRows}
          ${summaryRows}
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
          @page { size: portrait A4; margin: 10mm; }
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
 * 입출금내역 PDF 생성 및 다운로드
 * @param transactions 거래 내역 배열
 * @param summary 월별 요약 정보 (이월금, 수입합계, 지출합계, 잔액)
 * @param year 연도
 * @param month 월
 */
export async function generateFinancePdf(
  transactions: Transaction[],
  summary: MonthlyFinanceSummary,
  year: number,
  month: number
): Promise<void> {
  // 데이터가 전혀 없으면 안내
  if (transactions.length === 0 && summary.balanceForward === 0) {
    alert('저장할 입출금 내역이 없습니다.');
    return;
  }

  // HTML 미리 생성 (PDF 실패 시 인쇄 폴백에서도 사용)
  const sheetHtml = buildFinanceSheetHtml(transactions, summary, year, month);

  // 0. 라이브러리 동적 로드
  let html2canvas: (element: HTMLElement, options?: object) => Promise<HTMLCanvasElement>;
  let JsPDF: any;

  try {
    html2canvas = await loadHtml2Canvas();
  } catch (err) {
    console.error('[PDF] html2canvas 로드 실패, 인쇄 폴백 사용:', err);
    printFallback(sheetHtml, `${year}년 ${month}월 입출금내역`);
    return;
  }

  try {
    JsPDF = await loadJsPDF();
  } catch (err) {
    console.error('[PDF] jsPDF 로드 실패, 인쇄 폴백 사용:', err);
    printFallback(sheetHtml, `${year}년 ${month}월 입출금내역`);
    return;
  }

  // 1. 숨겨진 div 생성
  //    off-screen 배치 (opacity:0은 html2canvas가 빈 이미지로 캡처할 수 있음)
  const container = document.createElement('div');
  container.style.cssText = `
    position: absolute;
    left: -9999px;
    top: 0;
    width: 900px;
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

    // 3. jsPDF로 PDF 생성 (A4 세로)
    const pdf = new JsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // A4 세로 크기: 210mm x 297mm
    const pageWidth = 210;
    const pageHeight = 297;
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
    pdf.save(`${year}년_${month}월_입출금내역.pdf`);
  } catch (err) {
    // PDF 생성 실패 시 인쇄 폴백 사용
    console.error('[PDF] PDF 생성 실패, 인쇄 폴백 사용:', err);
    const message = err instanceof Error ? err.message : String(err);
    const usePrint = confirm(
      `PDF 자동 다운로드에 실패했습니다.\n(${message})\n\n인쇄 다이얼로그를 통해 PDF로 저장하시겠습니까?\n(인쇄 다이얼로그에서 "PDF로 저장"을 선택해 주세요)`
    );
    if (usePrint) {
      printFallback(sheetHtml, `${year}년 ${month}월 입출금내역`);
    }
  } finally {
    // 5. 임시 div 정리
    if (container.parentNode) {
      document.body.removeChild(container);
    }
  }
}
