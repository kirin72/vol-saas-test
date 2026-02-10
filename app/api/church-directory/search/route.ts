/**
 * 성당 디렉토리 검색 API
 * GET /api/church-directory/search?q=검색어
 *
 * 회원가입 전 사용하므로 인증 불요
 * 성당 이름으로 검색하여 매칭 결과 반환
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: 성당 이름 검색
export async function GET(request: NextRequest) {
  try {
    // 검색어 파라미터 추출
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim();

    // 검색어 없으면 빈 배열 반환
    if (!query || query.length < 1) {
      return NextResponse.json([]);
    }

    // 성당 디렉토리에서 이름 검색 (부분 일치, 최대 10건)
    const results = await prisma.churchDirectory.findMany({
      where: {
        name: {
          contains: query,
          mode: 'insensitive', // 대소문자 무시
        },
      },
      select: {
        id: true,
        diocese: true,
        name: true,
        address: true,
        phone: true,
        sundayMass: true,
        weekdayMass: true,
      },
      take: 10, // 최대 10건
      orderBy: {
        name: 'asc', // 이름순 정렬
      },
    });

    return NextResponse.json(results);
  } catch (error) {
    console.error('성당 검색 오류:', error);
    return NextResponse.json(
      { error: '성당 검색 중 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}
