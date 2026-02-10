/**
 * 빠른작업 PDF 다운로드 버튼
 * 대시보드에서 배정표/입출금내역 PDF를 바로 다운로드
 * 서버에서 전달받은 hasData 여부로 활성/비활성 결정
 */
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Wallet, Loader2 } from 'lucide-react';
import { generateAssignmentPdf } from '@/lib/generate-assignment-pdf';
import { generateFinancePdf } from '@/lib/generate-finance-pdf';
import { getMonthlyTransactions } from '@/lib/actions/finance';

interface QuickActionPdfButtonsProps {
  // 현재 달 배정 데이터 존재 여부
  hasAssignments: boolean;
  // 현재 달 입출금 데이터 존재 여부 (거래 또는 이월금)
  hasFinanceData: boolean;
  // 현재 년/월
  year: number;
  month: number;
}

export function QuickActionPdfButtons({
  hasAssignments,
  hasFinanceData,
  year,
  month,
}: QuickActionPdfButtonsProps) {
  // PDF 생성 로딩 상태
  const [generatingAssignment, setGeneratingAssignment] = useState(false);
  const [generatingFinance, setGeneratingFinance] = useState(false);

  // 배정표 PDF 다운로드
  const handleAssignmentPdf = async () => {
    setGeneratingAssignment(true);
    try {
      // API에서 현재 달 배정 데이터 가져오기
      const monthStr = `${year}-${String(month).padStart(2, '0')}`;
      const response = await fetch(`/api/admin/assignments?month=${monthStr}`);
      if (!response.ok) throw new Error('배정 데이터 조회 실패');
      const schedules = await response.json();

      // PDF 생성
      await generateAssignmentPdf(schedules, year, month);
    } catch (err) {
      console.error('배정표 PDF 생성 오류:', err);
      const message = err instanceof Error ? err.message : String(err);
      alert(`배정표 PDF 생성 중 오류가 발생했습니다.\n\n${message}`);
    } finally {
      setGeneratingAssignment(false);
    }
  };

  // 입출금내역 PDF 다운로드
  const handleFinancePdf = async () => {
    setGeneratingFinance(true);
    try {
      // Server Action으로 현재 달 입출금 데이터 가져오기
      const result = await getMonthlyTransactions(year, month);
      if (!result.success) throw new Error(result.error);

      const { transactions, summary } = result.data;

      // PDF 생성
      await generateFinancePdf(transactions, summary, year, month);
    } catch (err) {
      console.error('입출금내역 PDF 생성 오류:', err);
      const message = err instanceof Error ? err.message : String(err);
      alert(`입출금내역 PDF 생성 중 오류가 발생했습니다.\n\n${message}`);
    } finally {
      setGeneratingFinance(false);
    }
  };

  return (
    <>
      {/* 봉사자 배정표 저장 */}
      <Button
        variant="outline"
        className="min-h-[72px] h-auto py-4 flex flex-col items-center gap-2"
        disabled={!hasAssignments || generatingAssignment}
        onClick={handleAssignmentPdf}
      >
        {generatingAssignment ? (
          <Loader2 className="h-6 w-6 shrink-0 animate-spin" />
        ) : (
          <Download className="h-6 w-6 shrink-0" />
        )}
        <span className="text-sm text-center whitespace-nowrap">
          {generatingAssignment ? 'PDF 생성 중...' : '배정표 저장'}
        </span>
      </Button>

      {/* 입출금내역 저장 */}
      <Button
        variant="outline"
        className="min-h-[72px] h-auto py-4 flex flex-col items-center gap-2"
        disabled={!hasFinanceData || generatingFinance}
        onClick={handleFinancePdf}
      >
        {generatingFinance ? (
          <Loader2 className="h-6 w-6 shrink-0 animate-spin" />
        ) : (
          <Wallet className="h-6 w-6 shrink-0" />
        )}
        <span className="text-sm text-center whitespace-nowrap">
          {generatingFinance ? 'PDF 생성 중...' : '입출금내역 저장'}
        </span>
      </Button>
    </>
  );
}
