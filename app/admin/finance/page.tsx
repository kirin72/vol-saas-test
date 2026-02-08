/**
 * 입출금 관리 페이지
 * 월별 입출금 내역 조회 및 관리
 */
'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { MonthNavigator } from './_components/MonthNavigator';
import { FinanceTable } from './_components/FinanceTable';
import { FinanceSummary } from './_components/FinanceSummary';
import { FinanceRecordModal } from './_components/FinanceRecordModal';
import { ViewModeSelector, type ViewMode } from './_components/ViewModeSelector';
import {
  getMonthlyTransactions,
  getYearlyTransactions,
  getAllTransactions,
  getVolunteersForFinance,
} from '@/lib/actions/finance';
import type {
  Transaction,
  MonthlyFinanceSummary,
  YearlyFinanceSummary,
  AllFinanceSummary,
} from '@/types/finance';

export default function FinancePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL query params에서 년월 및 보기 모드 추출
  const now = new Date();
  const [viewMode, setViewMode] = useState<ViewMode>(
    (searchParams.get('view') as ViewMode) || 'monthly'
  );
  const [year, setYear] = useState(
    parseInt(searchParams.get('year') || String(now.getFullYear()))
  );
  const [month, setMonth] = useState(
    parseInt(searchParams.get('month') || String(now.getMonth() + 1))
  );

  // 데이터 상태
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<
    MonthlyFinanceSummary | YearlyFinanceSummary | AllFinanceSummary
  >({
    year,
    month,
    totalIncome: 0,
    totalExpense: 0,
    balanceForward: 0,
    balance: 0,
  });
  const [volunteers, setVolunteers] = useState<{ id: string; name: string }[]>(
    []
  );

  // 로딩 및 에러 상태
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 데이터 로드
  const loadData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 보기 모드에 따라 다른 API 호출
      if (viewMode === 'monthly') {
        // 월별 조회
        const transactionsResult = await getMonthlyTransactions(year, month);
        if (transactionsResult.success) {
          setTransactions(transactionsResult.data.transactions);
          setSummary(transactionsResult.data.summary);
        } else {
          setError(transactionsResult.error);
        }
      } else if (viewMode === 'yearly') {
        // 년간 조회
        const transactionsResult = await getYearlyTransactions(year);
        if (transactionsResult.success) {
          setTransactions(transactionsResult.data.transactions);
          setSummary(transactionsResult.data.summary);
        } else {
          setError(transactionsResult.error);
        }
      } else if (viewMode === 'all') {
        // 전체 조회
        const transactionsResult = await getAllTransactions();
        if (transactionsResult.success) {
          setTransactions(transactionsResult.data.transactions);
          setSummary(transactionsResult.data.summary);
        } else {
          setError(transactionsResult.error);
        }
      }

      // 봉사자 목록 조회
      const volunteersResult = await getVolunteersForFinance();
      if (volunteersResult.success) {
        setVolunteers(volunteersResult.data);
      }
    } catch (err) {
      setError('데이터를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 년월/보기모드 변경 시 데이터 재로드 및 URL 업데이트
  useEffect(() => {
    loadData();

    // URL 업데이트
    const params = new URLSearchParams();
    params.set('view', viewMode);
    if (viewMode === 'monthly' || viewMode === 'yearly') {
      params.set('year', String(year));
    }
    if (viewMode === 'monthly') {
      params.set('month', String(month));
    }

    router.push(`/admin/finance?${params.toString()}`, {
      scroll: false,
    });
  }, [year, month, viewMode]);

  // 보기 모드 변경 핸들러
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
  };

  // 년월 변경 핸들러
  const handleMonthChange = (newYear: number, newMonth: number) => {
    setYear(newYear);
    setMonth(newMonth);
  };

  // 모달 성공 핸들러 (저장 후 리스트 새로고침)
  const handleModalSuccess = () => {
    loadData();
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">입출금 관리</h1>
        <div className="flex items-center gap-4 flex-shrink-0">
          {/* 보기 모드 선택 */}
          <ViewModeSelector
            viewMode={viewMode}
            onViewModeChange={handleViewModeChange}
          />
          {/* 입출금 기록 버튼 */}
          <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            <span>입출금 기록</span>
          </Button>
        </div>
      </div>

      {/* 월 네비게이터 (월별 보기일 때만 표시) */}
      {viewMode === 'monthly' && (
        <MonthNavigator
          year={year}
          month={month}
          onMonthChange={handleMonthChange}
        />
      )}

      {/* 년 선택 (년간 보기일 때만 표시) */}
      {viewMode === 'yearly' && (
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setYear(year - 1)}
          >
            이전 년도
          </Button>
          <span className="text-lg font-semibold">{year}년</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setYear(year + 1)}
          >
            다음 년도
          </Button>
        </div>
      )}

      {/* 로딩 상태 */}
      {isLoading && (
        <div className="text-center py-12">
          <p className="text-gray-500">데이터를 불러오는 중...</p>
        </div>
      )}

      {/* 에러 상태 */}
      {error && !isLoading && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* 데이터 표시 */}
      {!isLoading && !error && (
        <>
          {/* 입출금 내역 테이블 */}
          <FinanceTable
            transactions={transactions}
            balanceForward={
              'balanceForward' in summary ? summary.balanceForward : undefined
            }
            showYear={viewMode !== 'monthly'}
          />

          {/* 합계 및 잔액 */}
          <FinanceSummary
            totalIncome={summary.totalIncome}
            totalExpense={summary.totalExpense}
            balanceForward={
              'balanceForward' in summary ? summary.balanceForward : undefined
            }
            balance={summary.balance}
            dateRange={
              'firstTransactionDate' in summary
                ? {
                    start: summary.firstTransactionDate,
                    end: summary.lastTransactionDate,
                  }
                : undefined
            }
          />
        </>
      )}

      {/* 입출금 기록 모달 */}
      <FinanceRecordModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleModalSuccess}
        volunteers={volunteers}
      />
    </div>
  );
}
