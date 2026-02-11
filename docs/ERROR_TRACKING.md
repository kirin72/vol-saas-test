# 에러 추적 가이드

## 개요

이 프로젝트는 개선된 에러 로깅 시스템을 사용하여 문제를 빠르게 파악하고 해결할 수 있습니다.

## 에러 발생 시 확인 방법

### 1. 사용자가 보는 에러 화면

사용자에게 에러가 발생하면 다음 정보가 표시됩니다:
- 에러 메시지 (사용자 친화적인 설명)
- **에러 ID** (예: `ERR-1707123456789-ABC123XYZ`)
- 문의 안내

### 2. 서버 로그 확인

개발 서버 또는 프로덕션 서버의 콘솔에서 상세한 에러 로그를 확인할 수 있습니다:

```
================================================================================
❌ ERROR OCCURRED
================================================================================
Timestamp: 2026-02-12T10:30:45.123Z
Error Type: PrismaClientKnownRequestError
Message: Unique constraint failed on the fields: (`organizationId`,`slug`)
Endpoint: /api/admin/mass-times
Method: GET
User ID: clx1234567890
Organization ID: org_abc123
Request Body: {...}
Additional Info: {"errorId":"ERR-1707123456789-ABC123XYZ"}
Stack Trace:
    at ...
    at ...
================================================================================
```

### 3. 에러 ID로 로그 검색

서버 로그에서 에러 ID를 검색하면 해당 에러의 전체 컨텍스트를 확인할 수 있습니다:

```bash
# 개발 서버 로그에서 검색
grep "ERR-1707123456789-ABC123XYZ" .next/server.log

# 프로덕션 서버 (예: Vercel)
vercel logs --follow | grep "ERR-1707123456789-ABC123XYZ"
```

## 에러 로깅이 적용된 API

현재 다음 API에 상세 에러 로깅이 적용되어 있습니다:
- `/api/admin/mass-times` (GET, POST)
- `/api/admin/assignments/auto-assign` (POST)

추가로 에러 로깅을 적용하려면:

```typescript
import { logError, getUserFriendlyErrorMessage, generateErrorId } from '@/lib/error-logger';

export async function GET(request: NextRequest) {
  try {
    // API 로직...
  } catch (error) {
    const errorId = generateErrorId();

    logError(error, {
      endpoint: '/api/your-endpoint',
      method: 'GET',
      userId: session?.user?.id,
      organizationId: session?.user?.organizationId,
      additionalInfo: { errorId },
    });

    return NextResponse.json(
      {
        error: '사용자 친화적 메시지',
        details: getUserFriendlyErrorMessage(error),
        errorId,
      },
      { status: 500 }
    );
  }
}
```

## 일반적인 에러 원인과 해결 방법

### 1. Prisma 에러

#### Unique constraint failed
```
원인: 이미 존재하는 데이터를 중복 생성하려고 함
해결: 기존 데이터 확인 후 update 또는 upsert 사용
```

#### Record to update not found
```
원인: 업데이트하려는 데이터가 없음
해결: 데이터 존재 여부 확인 후 처리
```

#### Foreign key constraint
```
원인: 참조하는 데이터가 없거나 삭제할 수 없음
해결: 관련 데이터 확인 및 cascade 설정 검토
```

### 2. 인증 에러

```
원인: 세션 만료 또는 권한 부족
해결: 로그아웃 후 재로그인 또는 권한 확인
```

### 3. 네트워크 에러

```
원인: API 요청 실패 또는 타임아웃
해결: 네트워크 상태 확인 및 재시도
```

## 프로덕션 환경 설정

### Sentry 연동 (권장)

프로덕션 환경에서는 Sentry와 같은 에러 트래킹 서비스 사용을 권장합니다:

```typescript
// lib/error-logger.ts에 추가
if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
  Sentry.captureException(error, {
    contexts: {
      custom: context,
    },
  });
}
```

### 환경 변수 설정

```env
# .env.production
SENTRY_DSN=your_sentry_dsn_here
```

## 에러 대응 프로세스

1. **사용자 보고** → 에러 ID 수집
2. **로그 검색** → 에러 ID로 상세 로그 확인
3. **원인 파악** → 스택 트레이스와 컨텍스트 분석
4. **수정 배포** → 버그 수정 및 배포
5. **사용자 안내** → 해결 완료 알림

## 문의

에러 관련 문의는 에러 ID를 포함하여 개발팀에 전달해 주세요.
