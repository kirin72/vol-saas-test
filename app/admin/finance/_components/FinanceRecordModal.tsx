/**
 * 입출금 기록 모달
 * React Hook Form + Zod 검증
 */
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { createTransaction } from '@/lib/actions/finance';
import {
  transactionSchema,
  type TransactionFormData,
} from '@/lib/validations/finance';

interface FinanceRecordModalProps {
  isOpen: boolean; // 모달 열림 상태
  onClose: () => void; // 모달 닫기 콜백
  onSuccess: () => void; // 저장 성공 후 리스트 새로고침 콜백
  volunteers: { id: string; name: string }[]; // 봉사자 목록
}

export function FinanceRecordModal({
  isOpen,
  onClose,
  onSuccess,
  volunteers,
}: FinanceRecordModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false); // 제출 중 상태
  const [error, setError] = useState<string | null>(null); // 에러 메시지

  // React Hook Form 초기화
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0], // YYYY-MM-DD 형식으로 변환
      type: 'expense',
      amount: 0,
      description: '',
    },
  });

  // 현재 선택된 유형 감시
  const selectedType = watch('type');

  // 폼 제출 핸들러
  const onSubmit = async (data: TransactionFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // 디버깅: 폼 데이터 확인
      console.log('폼 데이터:', data);

      // userId가 빈 문자열이면 undefined로 변환
      const userId = data.userId && data.userId.trim() !== '' ? data.userId : undefined;

      const result = await createTransaction({
        date: data.date,
        type: data.type,
        amount: data.amount,
        description: data.description,
        userId,
      });

      // 디버깅: 서버 응답 확인
      console.log('서버 응답:', result);

      if (result.success) {
        // 성공 시 모달 닫기 및 리스트 새로고침
        reset();
        onClose();
        onSuccess();
      } else {
        // 실패 시 에러 메시지 표시
        setError(result.error);
      }
    } catch (err) {
      console.error('저장 중 에러:', err);
      setError('저장에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 모달 닫기 핸들러
  const handleClose = () => {
    if (!isSubmitting) {
      reset();
      setError(null);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>입출금 기록</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* 거래 날짜 */}
          <div>
            <Label htmlFor="date">
              거래 날짜 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="date"
              type="date"
              {...register('date')}
              className="mt-1"
            />
            {errors.date && (
              <p className="text-red-500 text-sm mt-1">
                {errors.date.message}
              </p>
            )}
          </div>

          {/* 유형 (수입/지출) */}
          <div>
            <Label>
              유형 <span className="text-red-500">*</span>
            </Label>
            <RadioGroup
              defaultValue="expense"
              onValueChange={(value) => {
                register('type').onChange({
                  target: { value, name: 'type' },
                });
              }}
              className="flex gap-4 mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="income" id="income" />
                <Label htmlFor="income" className="font-normal cursor-pointer">
                  수입
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="expense" id="expense" />
                <Label htmlFor="expense" className="font-normal cursor-pointer">
                  지출
                </Label>
              </div>
            </RadioGroup>
            {errors.type && (
              <p className="text-red-500 text-sm mt-1">{errors.type.message}</p>
            )}
          </div>

          {/* 금액 */}
          <div>
            <Label htmlFor="amount">
              금액 (원) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="amount"
              type="number"
              {...register('amount', { valueAsNumber: true })}
              placeholder="50000"
              className="mt-1"
            />
            {errors.amount && (
              <p className="text-red-500 text-sm mt-1">
                {errors.amount.message}
              </p>
            )}
          </div>

          {/* 적요 */}
          <div>
            <Label htmlFor="description">
              적요 <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="봉사복 구입"
              className="mt-1"
              rows={3}
            />
            {errors.description && (
              <p className="text-red-500 text-sm mt-1">
                {errors.description.message}
              </p>
            )}
          </div>

          {/* 입금자 (수입일 경우만 표시) */}
          {selectedType === 'income' && (
            <div>
              <Label htmlFor="userId">입금자 (선택)</Label>
              <select
                id="userId"
                {...register('userId')}
                className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">선택 안 함</option>
                {volunteers.map((volunteer) => (
                  <option key={volunteer.id} value={volunteer.id}>
                    {volunteer.name}
                  </option>
                ))}
              </select>
              {errors.userId && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.userId.message}
                </p>
              )}
            </div>
          )}

          {/* 에러 메시지 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* 버튼 */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              취소
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? '저장 중...' : '저장'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
