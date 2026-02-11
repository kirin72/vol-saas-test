/**
 * 에러 로깅 유틸리티
 * API 에러를 상세하게 로깅하고 추적할 수 있도록 지원
 */

interface ErrorLogData {
  timestamp: string;
  errorType: string;
  message: string;
  stack?: string;
  userId?: string;
  organizationId?: string;
  endpoint?: string;
  method?: string;
  requestBody?: any;
  additionalInfo?: Record<string, any>;
}

/**
 * 에러를 상세하게 로깅합니다
 */
export function logError(
  error: unknown,
  context: {
    endpoint?: string;
    method?: string;
    userId?: string;
    organizationId?: string;
    requestBody?: any;
    additionalInfo?: Record<string, any>;
  } = {}
): void {
  const errorLog: ErrorLogData = {
    timestamp: new Date().toISOString(),
    errorType: error instanceof Error ? error.constructor.name : 'Unknown',
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    ...context,
  };

  // 콘솔에 상세 로그 출력
  console.error('='.repeat(80));
  console.error('❌ ERROR OCCURRED');
  console.error('='.repeat(80));
  console.error('Timestamp:', errorLog.timestamp);
  console.error('Error Type:', errorLog.errorType);
  console.error('Message:', errorLog.message);
  if (errorLog.endpoint) console.error('Endpoint:', errorLog.endpoint);
  if (errorLog.method) console.error('Method:', errorLog.method);
  if (errorLog.userId) console.error('User ID:', errorLog.userId);
  if (errorLog.organizationId) console.error('Organization ID:', errorLog.organizationId);
  if (errorLog.requestBody) {
    console.error('Request Body:', JSON.stringify(errorLog.requestBody, null, 2));
  }
  if (errorLog.additionalInfo) {
    console.error('Additional Info:', JSON.stringify(errorLog.additionalInfo, null, 2));
  }
  if (errorLog.stack) {
    console.error('Stack Trace:');
    console.error(errorLog.stack);
  }
  console.error('='.repeat(80));

  // TODO: 프로덕션에서는 외부 에러 트래킹 서비스(Sentry, LogRocket 등)로 전송
  // 예시:
  // if (process.env.NODE_ENV === 'production') {
  //   Sentry.captureException(error, { contexts: { custom: context } });
  // }
}

/**
 * 사용자 친화적인 에러 메시지를 반환합니다
 */
export function getUserFriendlyErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // Prisma 에러
    if (error.message.includes('Unique constraint')) {
      return '이미 존재하는 데이터입니다.';
    }
    if (error.message.includes('Foreign key constraint')) {
      return '연결된 데이터가 있어 처리할 수 없습니다.';
    }
    if (error.message.includes('Record to update not found')) {
      return '데이터를 찾을 수 없습니다.';
    }
    if (error.message.includes('Record to delete does not exist')) {
      return '삭제할 데이터가 없습니다.';
    }

    // 일반 에러
    return error.message;
  }

  return '알 수 없는 오류가 발생했습니다.';
}

/**
 * 에러 ID를 생성합니다 (문제 추적용)
 */
export function generateErrorId(): string {
  return `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
}
