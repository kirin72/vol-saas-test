/**
 * 본당 관리자 대시보드
 * 통계 카드 4개 + 빠른 작업 버튼 3개 + 배정 통계
 */
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, CalendarCheck, CheckCircle, TrendingUp } from 'lucide-react';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { DesktopTable, MobileCardList, MobileCard, MobileCardHeader, MobileCardRow } from '@/components/ui/responsive-table';
import { QuickActionPdfButtons } from './_components/QuickActionPdfButtons';
import { WelcomeBanner } from './_components/WelcomeBanner';

// 통계 데이터 가져오기 함수 (직접 DB 쿼리)
async function getStats(organizationId: string) {
  try {
    // 이번 달 시작/종료 날짜 계산
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // 1. 전체 봉사자 수 (관리자도 봉사 역할이 있으면 포함)
    const volunteerCount = await prisma.user.count({
      where: {
        organizationId,
        role: { in: ['VOLUNTEER', 'ADMIN'] },
        status: 'ACTIVE',
        userRoles: { some: {} },
      },
    });

    // 2. 전체 역할 수
    const roleCount = await prisma.volunteerRole.count({
      where: {
        organizationId,
        isActive: true,
      },
    });

    // 3. 이번 달 미사 수
    const massCount = await prisma.massSchedule.count({
      where: {
        organizationId,
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    });

    // 4. 이번 달 배정 완료율 계산
    const masses = await prisma.massSchedule.findMany({
      where: {
        organizationId,
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      include: {
        massTemplate: {
          include: {
            slots: true,
          },
        },
        assignments: true,
      },
    });

    let totalRequiredSlots = 0;
    let assignedSlots = 0;

    masses.forEach((mass) => {
      if (mass.massTemplate) {
        mass.massTemplate.slots.forEach((slot) => {
          totalRequiredSlots += slot.requiredCount;
        });
        assignedSlots += mass.assignments.length;
      }
    });

    const assignmentRate =
      totalRequiredSlots > 0
        ? Math.round((assignedSlots / totalRequiredSlots) * 100)
        : 0;

    // 5. 봉사자별 배정 통계 (관리자도 봉사 역할이 있으면 포함)
    const volunteers = await prisma.user.findMany({
      where: {
        organizationId,
        role: { in: ['VOLUNTEER', 'ADMIN'] },
        status: 'ACTIVE',
        userRoles: { some: {} },
      },
      select: {
        id: true,
        name: true,
        baptismalName: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    // 이번 달 배정 조회
    const assignments = await prisma.assignment.findMany({
      where: {
        organizationId,
        massSchedule: {
          date: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
      },
      select: {
        userId: true,
        volunteerRole: {
          select: {
            name: true,
          },
        },
      },
    });

    // 봉사자별 배정 횟수 및 역할 집계
    const assignmentMap = new Map<string, { count: number; roles: Set<string> }>();

    assignments.forEach((assignment) => {
      const existing = assignmentMap.get(assignment.userId) || {
        count: 0,
        roles: new Set<string>(),
      };
      existing.count += 1;
      existing.roles.add(assignment.volunteerRole.name);
      assignmentMap.set(assignment.userId, existing);
    });

    // 봉사자 통계 생성
    const volunteerStats = volunteers.map((volunteer) => {
      const stats = assignmentMap.get(volunteer.id) || {
        count: 0,
        roles: new Set<string>(),
      };
      return {
        id: volunteer.id,
        name: volunteer.name,
        baptismalName: volunteer.baptismalName,
        assignmentCount: stats.count,
        roles: Array.from(stats.roles),
      };
    });

    // 6. 이번 달 입출금 데이터 여부 확인
    const financeTransactionCount = await prisma.transaction.count({
      where: {
        organizationId,
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    });

    // 전월 이월금 계산 (거래 없어도 이월금이 있으면 PDF 가능)
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    const previousTransactions = await prisma.transaction.findMany({
      where: {
        organizationId,
        date: {
          lte: previousMonthEnd,
        },
        type: {
          not: 'balance_forward',
        },
      },
      select: {
        type: true,
        amount: true,
      },
    });

    let balanceForward = 0;
    for (const tx of previousTransactions) {
      if (tx.type === 'income') {
        balanceForward += tx.amount;
      } else if (tx.type === 'expense') {
        balanceForward -= tx.amount;
      }
    }

    // 입출금 데이터 존재 여부 (거래 내역 또는 이월금이 있으면 true)
    const hasFinanceData = financeTransactionCount > 0 || balanceForward !== 0;

    // 배정된 고유 봉사자 수 (1회 이상 배정된 봉사자)
    const assignedVolunteerCount = volunteerStats.filter((v) => v.assignmentCount > 0).length;

    // 배정 횟수별 통계 (미배정, 3회이하, 4~5회, 6~7회, 8회이상)
    const distribution = {
      zero: volunteerStats.filter((v) => v.assignmentCount === 0).length,
      upToThree: volunteerStats.filter((v) => v.assignmentCount >= 1 && v.assignmentCount <= 3).length,
      fourToFive: volunteerStats.filter((v) => v.assignmentCount >= 4 && v.assignmentCount <= 5).length,
      sixToSeven: volunteerStats.filter((v) => v.assignmentCount >= 6 && v.assignmentCount <= 7).length,
      eightPlus: volunteerStats.filter((v) => v.assignmentCount >= 8).length,
    };

    return {
      volunteerCount,
      roleCount,
      massCount,
      assignmentRate,
      assignedVolunteerCount,
      assignedSlots,
      totalRequiredSlots,
      volunteerStats,
      distribution,
      hasFinanceData,
    };
  } catch (error) {
    console.error('통계 조회 오류:', error);
    return {
      volunteerCount: 0,
      roleCount: 0,
      massCount: 0,
      assignmentRate: 0,
      assignedVolunteerCount: 0,
      assignedSlots: 0,
      totalRequiredSlots: 0,
      volunteerStats: [],
      distribution: { zero: 0, upToThree: 0, fourToFive: 0, sixToSeven: 0, eightPlus: 0 },
      hasFinanceData: false,
    };
  }
}

export default async function AdminDashboardPage() {
  // 세션 확인
  const session = await auth();

  if (!session || !session.user.organizationId) {
    redirect('/auth/login');
  }

  // 조직 정보 가져오기
  const organization = await prisma.organization.findUnique({
    where: { id: session.user.organizationId },
    select: { name: true, groupName: true },
  });

  // 통계 데이터 가져오기
  const stats = await getStats(session.user.organizationId);

  // 현재 년/월 (빠른작업 PDF 버튼에 전달)
  const now = new Date();

  return (
    <div className="space-y-8">
      {/* 페이지 제목 */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          {organization?.name}
          {organization?.groupName && ` - ${organization.groupName}`}
          {' '}대시보드
        </h1>
        <p className="text-gray-600 mt-2">
          {organization?.groupName || '본당'}의 전체 현황을 한눈에 확인하세요
        </p>
      </div>

      {/* 첫 로그인 관리자 웰컴 배너 (isFirstLogin이 true일 때만 표시) */}
      {session.user.role === 'ADMIN' && (
        <WelcomeBanner isFirstLogin={session.user.isFirstLogin} />
      )}

      {/* 통계 카드 4개 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        {/* 1. 전체 봉사자 수 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              전체 봉사자
            </CardTitle>
            <Users className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-gray-900">
              {stats.volunteerCount}
            </div>
            <p className="text-xs text-gray-500 mt-1">활성 봉사자 수</p>
          </CardContent>
        </Card>

        {/* 2. 봉사 배정 (배정된 봉사자 / 전체 봉사자) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              봉사 배정
            </CardTitle>
            <CalendarCheck className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-gray-900">
              {stats.assignedVolunteerCount}<span className="text-lg text-gray-500">/{stats.volunteerCount}명</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">이번 달 배정된 봉사자</p>
          </CardContent>
        </Card>

        {/* 3. 완료된 봉사 (배정 슬롯 / 전체 필요 슬롯) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              완료된 봉사
            </CardTitle>
            <CheckCircle className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-gray-900">
              {stats.assignedSlots}<span className="text-lg text-gray-500">/{stats.totalRequiredSlots}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">이번 달 배정 현황</p>
          </CardContent>
        </Card>

        {/* 4. 배정 완료율 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              배정 완료율
            </CardTitle>
            <TrendingUp className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-gray-900">
              {stats.assignmentRate}%
            </div>
            <p className="text-xs text-gray-500 mt-1">이번 달 배정 현황</p>
          </CardContent>
        </Card>
      </div>

      {/* 빠른 작업 버튼 */}
      <Card>
        <CardHeader>
          <CardTitle>빠른 작업</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {/* 봉사자 등록 */}
            <Button asChild className="min-h-[72px] h-auto py-4">
              <Link
                href="/admin/volunteers/new"
                className="flex flex-col items-center gap-2"
              >
                <Users className="h-6 w-6 shrink-0" />
                <span className="text-sm text-center whitespace-nowrap">봉사자 등록</span>
              </Link>
            </Button>

            {/* 일정 추가 */}
            <Button asChild variant="outline" className="min-h-[72px] h-auto py-4">
              <Link
                href="/admin/schedules?action=new"
                className="flex flex-col items-center gap-2"
              >
                <CalendarCheck className="h-6 w-6 shrink-0" />
                <span className="text-sm text-center whitespace-nowrap">일정 추가</span>
              </Link>
            </Button>

            {/* 봉사자 배정 */}
            <Button asChild variant="outline" className="min-h-[72px] h-auto py-4">
              <Link
                href="/admin/assignments"
                className="flex flex-col items-center gap-2"
              >
                <TrendingUp className="h-6 w-6 shrink-0" />
                <span className="text-sm text-center whitespace-nowrap">봉사자 배정</span>
              </Link>
            </Button>

            {/* 봉사자 배정표 저장 / 입출금내역 저장 (PDF 다운로드) */}
            <QuickActionPdfButtons
              hasAssignments={stats.assignedSlots > 0}
              hasFinanceData={stats.hasFinanceData}
              year={now.getFullYear()}
              month={now.getMonth() + 1}
            />
          </div>
        </CardContent>
      </Card>

      {/* 배정 통계 섹션 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 배정 공평도 */}
        <Card>
          <CardHeader>
            <CardTitle>배정 공평도</CardTitle>
            <p className="text-sm text-gray-500">이번 달 배정 횟수 분포</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">미배정</span>
              <Badge variant="default">{stats.distribution.zero}명</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">3회 이하</span>
              <Badge variant="secondary">{stats.distribution.upToThree}명</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">4~5회</span>
              <Badge variant="secondary">{stats.distribution.fourToFive}명</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">6~7회</span>
              <Badge variant="secondary">{stats.distribution.sixToSeven}명</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">8회 이상</span>
              <Badge variant="destructive">{stats.distribution.eightPlus}명</Badge>
            </div>
          </CardContent>
        </Card>

        {/* 봉사자별 배정 현황 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>봉사자별 배정 현황</CardTitle>
                <p className="text-sm text-gray-500">이번 달 배정 횟수 및 역할</p>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/admin/assignments">전체 보기</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {stats.volunteerStats.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                등록된 봉사자가 없습니다
              </p>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                {/* 모바일 카드 뷰 */}
                <MobileCardList>
                  {stats.volunteerStats
                    .sort((a, b) => b.assignmentCount - a.assignmentCount)
                    .slice(0, 10)
                    .map((volunteer) => (
                      <MobileCard key={volunteer.id}>
                        <MobileCardHeader>
                          <span className="font-medium text-sm">
                            {volunteer.name}
                            {volunteer.baptismalName && (
                              <span className="text-gray-500 ml-1 text-xs">({volunteer.baptismalName})</span>
                            )}
                          </span>
                          <Badge
                            variant={
                              volunteer.assignmentCount === 0 ? 'default'
                                : volunteer.assignmentCount >= 3 ? 'destructive' : 'secondary'
                            }
                            className="text-xs"
                          >
                            {volunteer.assignmentCount === 0 ? '미배정' : `${volunteer.assignmentCount}회`}
                          </Badge>
                        </MobileCardHeader>
                        {volunteer.roles.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {volunteer.roles.map((role) => (
                              <Badge key={role} variant="outline" className="text-xs">{role}</Badge>
                            ))}
                          </div>
                        )}
                      </MobileCard>
                    ))}
                </MobileCardList>

                {/* 데스크톱 테이블 뷰 */}
                <DesktopTable>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>이름</TableHead>
                        <TableHead className="text-center">배정 횟수</TableHead>
                        <TableHead>배정 역할</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.volunteerStats
                        .sort((a, b) => b.assignmentCount - a.assignmentCount)
                        .slice(0, 10)
                        .map((volunteer) => (
                          <TableRow key={volunteer.id}>
                            <TableCell className="font-medium">
                              {volunteer.name}
                              {volunteer.baptismalName && (
                                <span className="text-gray-500 ml-1">({volunteer.baptismalName})</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge
                                variant={
                                  volunteer.assignmentCount === 0 ? 'default'
                                    : volunteer.assignmentCount >= 3 ? 'destructive' : 'secondary'
                                }
                              >
                                {volunteer.assignmentCount === 0 ? '미배정' : `${volunteer.assignmentCount}회`}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {volunteer.roles.length === 0 ? (
                                <span className="text-gray-400 text-sm">-</span>
                              ) : (
                                <div className="flex flex-wrap gap-1">
                                  {volunteer.roles.map((role) => (
                                    <Badge key={role} variant="outline" className="text-xs">{role}</Badge>
                                  ))}
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </DesktopTable>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
