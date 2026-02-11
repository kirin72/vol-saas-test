/**
 * NextAuth SessionProvider 래퍼
 * 클라이언트 컴포넌트에서 useSession 훅을 사용하기 위해 필요
 */
'use client';

import { SessionProvider } from 'next-auth/react';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
