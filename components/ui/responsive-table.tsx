/**
 * 반응형 테이블 유틸리티 컴포넌트
 * 데스크톱: 기존 Table / 모바일: 카드 리스트로 자동 전환
 */
import { cn } from '@/lib/utils';

// 데스크톱 전용 테이블 래퍼 (sm 미만에서 숨김)
export function DesktopTable({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('hidden sm:block', className)} {...props}>
      {children}
    </div>
  );
}

// 모바일 전용 카드 리스트 래퍼 (sm 이상에서 숨김)
export function MobileCardList({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('sm:hidden space-y-3', className)} {...props}>
      {children}
    </div>
  );
}

// 모바일 카드 아이템
export function MobileCard({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'border border-gray-200 rounded-lg p-4 bg-white space-y-2',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// 모바일 카드 한 줄 (라벨 + 값)
export function MobileCardRow({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('flex justify-between items-center', className)}>
      <span className="text-sm text-gray-500">{label}</span>
      <div className="text-sm font-medium">{children}</div>
    </div>
  );
}

// 모바일 카드 헤더 (주요 정보 강조)
export function MobileCardHeader({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex justify-between items-start pb-2 border-b border-gray-100', className)}
      {...props}
    >
      {children}
    </div>
  );
}

// 모바일 카드 액션 영역
export function MobileCardActions({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex gap-2 pt-2', className)}
      {...props}
    >
      {children}
    </div>
  );
}
