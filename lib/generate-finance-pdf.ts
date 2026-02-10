/**
 * 입출금내역 PDF 생성 유틸리티
 * html2canvas로 HTML을 캡처한 후 jspdf로 PDF 변환하여 다운로드
 */
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
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

// 결재란 생성
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

  // 전체 HTML 조합
  return `
    <div style="
      font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif;
      padding: 30px;
      background: white;
      width: 800px;
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

  // 1. 숨겨진 div 생성
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.zIndex = '-1';
  container.innerHTML = buildFinanceSheetHtml(transactions, summary, year, month);
  document.body.appendChild(container);

  try {
    // 2. html2canvas로 캡처 (2배 스케일로 고화질)
    const canvas = await html2canvas(container.firstElementChild as HTMLElement, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    // 3. jsPDF로 PDF 생성 (A4 세로)
    const pdf = new jsPDF({
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

    // 이미지 삽입
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
  } finally {
    // 5. 임시 div 정리
    document.body.removeChild(container);
  }
}
