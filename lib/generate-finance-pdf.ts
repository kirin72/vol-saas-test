/**
 * 입출금내역 PDF 생성 유틸리티
 * jspdf + jspdf-autotable로 직접 테이블 PDF 생성 (html2canvas 불필요)
 */
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { registerKoreanFont } from '@/lib/pdf/load-korean-font';
import type { Transaction, MonthlyFinanceSummary } from '@/types/finance';

// hex 색상 → RGB 배열 변환 (예: '#2563eb' → [37, 99, 235])
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

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

// 색상 상수
const BLUE = hexToRgb('#2563eb');      // 수입 색상
const RED = hexToRgb('#dc2626');       // 지출 색상
const GREEN = hexToRgb('#16a34a');     // 잔액 양수
const GRAY = hexToRgb('#999999');      // 비활성 텍스트
const HEADER_BG = hexToRgb('#e8e8e8'); // 헤더 배경
const BF_BG = hexToRgb('#f8f9fa');     // 이월금 배경
const TOTAL_BG = hexToRgb('#f0f4ff');  // 합계 배경
const BALANCE_BG = hexToRgb('#e8f5e9'); // 잔액 배경

/**
 * 입출금내역 PDF 내부 생성 (jsPDF 인스턴스 반환)
 * 다운로드와 Blob 생성 모두에서 재사용
 */
async function buildFinancePdf(
  transactions: Transaction[],
  summary: MonthlyFinanceSummary,
  year: number,
  month: number
): Promise<jsPDF> {
  const { balanceForward, totalIncome, totalExpense, balance } = summary;

  // 1. jsPDF 인스턴스 생성 (A4 세로)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // 2. 한글 폰트 등록
  await registerKoreanFont(doc);

  // 3. 제목
  doc.setFontSize(20);
  doc.setTextColor(17, 17, 17);
  doc.text(`${year}년 ${month}월 입출금내역`, 105, 20, { align: 'center' });

  // 4. 테이블 body 데이터 구성
  const body: any[][] = [];

  // 이월금 행 (0이 아닐 때만)
  if (balanceForward !== 0) {
    body.push([
      { content: `${String(month).padStart(2, '0')}/01`, styles: { halign: 'center' as const } },
      { content: formatAmount(balanceForward), styles: { halign: 'right' as const, textColor: BLUE, fontStyle: 'bold' as const } },
      { content: '-', styles: { halign: 'center' as const, textColor: GRAY } },
      { content: '전월 이월', styles: { textColor: [85, 85, 85] } },
    ]);
  }

  // 거래 내역 행
  transactions.forEach((tx) => {
    const isIncome = tx.type === 'income';
    const userInfo = tx.user ? ` (${tx.user.name})` : '';

    body.push([
      { content: formatDate(tx.date), styles: { halign: 'center' as const } },
      // 수입 셀
      isIncome
        ? { content: formatAmount(tx.amount), styles: { halign: 'right' as const, textColor: BLUE, fontStyle: 'bold' as const } }
        : { content: '-', styles: { halign: 'center' as const, textColor: GRAY } },
      // 지출 셀
      !isIncome
        ? { content: formatAmount(tx.amount), styles: { halign: 'right' as const, textColor: RED, fontStyle: 'bold' as const } }
        : { content: '-', styles: { halign: 'center' as const, textColor: GRAY } },
      // 적요
      { content: `${tx.description}${userInfo}` },
    ]);
  });

  // 5. autoTable 호출
  autoTable(doc, {
    startY: 28,
    // 테이블 헤더
    head: [['날짜', '수입', '지출', '적요']],
    body: body,
    // 합계 + 잔액 행을 foot으로
    foot: [
      // 합계 행
      [
        { content: '합계', styles: { halign: 'center' as const, fontStyle: 'bold' as const } },
        { content: formatAmount(totalIncome), styles: { halign: 'right' as const, textColor: BLUE, fontStyle: 'bold' as const } },
        { content: formatAmount(totalExpense), styles: { halign: 'right' as const, textColor: RED, fontStyle: 'bold' as const } },
        { content: '' },
      ],
      // 잔액 행
      [
        { content: '잔액 (이월 + 수입 - 지출)', colSpan: 3, styles: { halign: 'right' as const, fontStyle: 'bold' as const } },
        {
          content: formatAmount(balance),
          styles: {
            halign: 'right' as const,
            fontStyle: 'bold' as const,
            fontSize: 11,
            textColor: balance >= 0 ? GREEN : RED,
          },
        },
      ],
    ],
    // 테마 및 스타일
    theme: 'grid',
    styles: {
      font: 'NotoSansKR',
      fontSize: 9,
      cellPadding: 3,
      lineColor: [51, 51, 51],
      lineWidth: 0.3,
    },
    headStyles: {
      fillColor: HEADER_BG,
      textColor: [0, 0, 0],
      fontStyle: 'normal',
      halign: 'center',
      fontSize: 10,
    },
    footStyles: {
      fillColor: TOTAL_BG,
      textColor: [0, 0, 0],
      fontStyle: 'normal',
    },
    // 컬럼별 스타일
    columnStyles: {
      0: { cellWidth: 30 },       // 날짜
      1: { cellWidth: 35 },       // 수입
      2: { cellWidth: 35 },       // 지출
      3: { cellWidth: 'auto' },   // 적요
    },
    // 이월금 행 / 잔액 행 배경색 처리
    didParseCell: (data) => {
      // 이월금 행 (body의 첫 행이고 이월금이 있을 때)
      if (data.section === 'body' && data.row.index === 0 && balanceForward !== 0) {
        data.cell.styles.fillColor = BF_BG;
      }
      // 잔액 행 배경색 (foot의 두 번째 행)
      if (data.section === 'foot' && data.row.index === 1) {
        data.cell.styles.fillColor = BALANCE_BG;
      }
    },
    // 매 페이지 헤더 반복
    showHead: 'everyPage',
    showFoot: 'lastPage',
  });

  // 6. 하단 생성일
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setTextColor(136, 136, 136);
  doc.text(`생성일: ${new Date().toLocaleDateString('ko-KR')}`, 200, pageHeight - 10, { align: 'right' });

  return doc;
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

  try {
    const doc = await buildFinancePdf(transactions, summary, year, month);
    // PDF 파일 다운로드
    doc.save(`${year}년_${month}월_입출금내역.pdf`);
  } catch (err) {
    console.error('[PDF] 입출금내역 PDF 생성 실패:', err);
    alert(`PDF 생성에 실패했습니다.\n${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * 입출금내역 PDF를 Blob으로 반환 (이메일 전송용)
 * @param transactions 거래 내역 배열
 * @param summary 월별 요약 정보
 * @param year 연도
 * @param month 월
 * @returns PDF Blob
 */
export async function generateFinancePdfBlob(
  transactions: Transaction[],
  summary: MonthlyFinanceSummary,
  year: number,
  month: number
): Promise<Blob> {
  const doc = await buildFinancePdf(transactions, summary, year, month);
  return doc.output('blob');
}
