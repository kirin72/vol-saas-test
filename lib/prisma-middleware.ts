/**
 * Multi-tenancy 데이터 격리를 위한 Prisma Middleware
 * - SUPER_ADMIN을 제외한 모든 쿼리에 organizationId 필터 자동 주입
 * - 조직별 Row-level 데이터 격리 보장
 */
import { Prisma } from '@prisma/client';

/**
 * Multi-tenancy Middleware 생성
 * @param organizationId - 현재 사용자의 조직 ID (SUPER_ADMIN은 null)
 * @param userRole - 현재 사용자의 역할 (SUPER_ADMIN, ADMIN, VOLUNTEER)
 */
export function createMultiTenancyMiddleware(
  organizationId: string | null,
  userRole: string
) {
  return async (
    params: Prisma.MiddlewareParams,
    next: (params: Prisma.MiddlewareParams) => Promise<any>
  ) => {
    // SUPER_ADMIN은 모든 조직 데이터 접근 가능
    if (userRole === 'SUPER_ADMIN') {
      return next(params);
    }

    // Multi-tenancy 적용 대상 모델
    const multiTenantModels = [
      'Organization',
      'User',
      'VolunteerRole',
      'MassTemplate',
      'TemplateSlot',
      'MassSchedule',
      'Assignment',
      'AssignmentHistory',
      'Subscription',
    ];

    // 대상 모델이 아니면 필터링 없이 실행
    if (!multiTenantModels.includes(params.model || '')) {
      return next(params);
    }

    // organizationId가 없으면 접근 거부
    if (!organizationId) {
      throw new Error('Unauthorized: organizationId is required');
    }

    // 쿼리 타입별 organizationId 필터 주입
    if (params.action === 'findMany' || params.action === 'findFirst') {
      params.args.where = { ...params.args.where, organizationId };
    } else if (params.action === 'findUnique') {
      params.args.where = { ...params.args.where, organizationId };
    } else if (params.action === 'create') {
      params.args.data = { ...params.args.data, organizationId };
    } else if (
      params.action === 'update' ||
      params.action === 'updateMany' ||
      params.action === 'delete' ||
      params.action === 'deleteMany'
    ) {
      params.args.where = { ...params.args.where, organizationId };
    }

    return next(params);
  };
}
