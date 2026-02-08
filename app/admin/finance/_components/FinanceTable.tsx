/**
 * 입출금 내역 테이블
 * 월별 입출금 내역을 테이블로 렌더링
 */
'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Transaction } from '@/types/finance';

interface FinanceTableProps {
  transactions: Transaction[]; // 입출금 내역 리스트
  balanceForward?: number; // 전월/전년도 이월금액 (선택적)
  showYear?: boolean; // 년도 표시 여부 (년간/전체 보기)
}

export function FinanceTable({
  transactions,
  balanceForward = 0,
  showYear = false,
}: FinanceTableProps) {
  // 날짜 포맷 함수
  const formatDate = (date: Date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    const weekday = weekdays[d.getDay()];

    // 년도 표시 여부에 따라 형식 변경
    if (showYear) {
      return `${year}.${month}.${day} (${weekday})`;
    }
    return `${month}/${day} (${weekday})`;
  };

  // 금액 포맷 함수: 1,000원
  const formatAmount = (amount: number) => {
    return amount.toLocaleString('ko-KR') + '원';
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-32">날짜</TableHead>
            <TableHead className="w-32 text-right">수입</TableHead>
            <TableHead className="w-32 text-right">지출</TableHead>
            <TableHead>적요</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {/* 이월금액 표시 (잔액이 있을 경우만) */}
          {balanceForward > 0 && (
            <TableRow className="bg-gray-50">
              <TableCell className="font-medium">
                {transactions.length > 0
                  ? formatDate(
                      new Date(
                        new Date(transactions[0].date).getFullYear(),
                        new Date(transactions[0].date).getMonth(),
                        1
                      )
                    )
                  : ''}
              </TableCell>
              <TableCell className="text-right">-</TableCell>
              <TableCell className="text-right">-</TableCell>
              <TableCell className="text-gray-600">
                {showYear ? '전년도 이월' : '전월 이월'}{' '}
                <span className="font-semibold text-blue-600">{formatAmount(balanceForward)}</span>
              </TableCell>
            </TableRow>
          )}

          {/* 입출금 내역 */}
          {transactions.map((transaction) => (
            <TableRow key={transaction.id}>
              <TableCell className="font-medium">
                {formatDate(transaction.date)}
              </TableCell>
              <TableCell className="text-right">
                {transaction.type === 'income' ? (
                  <span className="text-blue-600 font-semibold">
                    {formatAmount(transaction.amount)}
                  </span>
                ) : (
                  '-'
                )}
              </TableCell>
              <TableCell className="text-right">
                {transaction.type === 'expense' ? (
                  <span className="text-red-600 font-semibold">
                    {formatAmount(transaction.amount)}
                  </span>
                ) : (
                  '-'
                )}
              </TableCell>
              <TableCell className="text-gray-700">
                {transaction.description}
                {transaction.user && (
                  <span className="text-gray-500 ml-2">
                    ({transaction.user.name})
                  </span>
                )}
              </TableCell>
            </TableRow>
          ))}

          {/* 데이터가 없을 경우 */}
          {transactions.length === 0 && balanceForward === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-gray-500 py-8">
                {showYear ? '입출금 내역이 없습니다.' : '이번 달 입출금 내역이 없습니다.'}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
