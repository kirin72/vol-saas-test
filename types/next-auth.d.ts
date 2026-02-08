/**
 * NextAuth 타입 확장
 * Session과 User에 organizationId, role 필드 추가
 */
import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      organizationId: string | null;
      role: string;
    } & DefaultSession['user'];
  }

  interface User {
    id: string;
    organizationId: string | null;
    role: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    organizationId: string | null;
    role: string;
  }
}
