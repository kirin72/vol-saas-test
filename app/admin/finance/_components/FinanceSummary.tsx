/**
 * 입출금 합계 및 잔액 표시
 * 화면 하단에 수입/지출 합계 및 잔액 표시
 */
'use client';

import { Card, CardContent } from '@/components/ui/card';

interface FinanceSummaryProps {
  totalIncome: number; // 수입 합계
  totalExpense: number; // 지출 합계
  balanceForward?: number; // 전월/전년도 이월 (선택적)
  balance: number; // 잔액
  dateRange?: { start: Date | null; end: Date | null }; // 날짜 범위 (전체 보기용)
}

export function FinanceSummary({
  totalIncome,
  totalExpense,
  balanceForward,
  balance,
  dateRange,
}: FinanceSummaryProps) {
  // 금액 포맷 함수
  const formatAmount = (amount: number) => {
    return amount.toLocaleString('ko-KR') + '원';
  };

  // 날짜 포맷 함수
  const formatDateRange = () => {
    if (!dateRange || !dateRange.start || !dateRange.end) return '';

    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);

    const formatDate = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}.${month}.${day}`;
    };

    return `${formatDate(start)} ~ ${formatDate(end)}`;
  };

  return (
    <Card className="bg-gray-50">
      <CardContent className="pt-6">
        {/* 날짜 범위 표시 (전체 보기일 때만) */}
        {dateRange && (
          <div className="text-center mb-4">
            <div className="text-sm text-gray-600">기간</div>
            <div className="text-base font-semibold text-gray-700">
              {formatDateRange()}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* 이월금액 (있을 경우만 표시) */}
          {balanceForward !== undefined && (
            <div className="text-center">
              <div className="text-sm text-gray-600 mb-1">
                {dateRange ? '이월' : '전월 이월'}
              </div>
              <div className="text-lg font-semibold text-gray-700">
                {formatAmount(balanceForward)}
              </div>
            </div>
          )}

          {/* 수입 합계 */}
          <div className="text-center">
            <div className="text-sm text-gray-600 mb-1">수입 합계</div>
            <div className="text-lg font-semibold text-blue-600">
              {formatAmount(totalIncome)}
            </div>
          </div>

          {/* 지출 합계 */}
          <div className="text-center">
            <div className="text-sm text-gray-600 mb-1">지출 합계</div>
            <div className="text-lg font-semibold text-red-600">
              {formatAmount(totalExpense)}
            </div>
          </div>

          {/* 잔액 */}
          <div className="text-center">
            <div className="text-sm text-gray-600 mb-1">잔액</div>
            <div
              className={`text-xl font-bold ${
                balance >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {formatAmount(balance)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
