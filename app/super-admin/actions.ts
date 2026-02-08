/**
 * Super Admin 관련 Server Actions
 */
'use server';

import { signOut } from '@/lib/auth';
import { redirect } from 'next/navigation';

/**
 * 로그아웃 처리
 * NextAuth signOut 후 총괄 관리자 로그인 페이지로 리다이렉트
 */
export async function handleLogout() {
  try {
    // NextAuth signOut 실행 (세션 삭제)
    await signOut({ redirect: false });
  } catch (error) {
    console.error('로그아웃 오류:', error);
  }

  // 총괄 관리자 로그인 페이지로 리다이렉트
  redirect('/auth/super-admin');
}
