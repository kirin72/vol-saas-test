/**
 * /super-admin 루트 경로
 * 대시보드로 리다이렉트
 */
import { redirect } from 'next/navigation';

export default function SuperAdminRootPage() {
  redirect('/super-admin/dashboard');
}
