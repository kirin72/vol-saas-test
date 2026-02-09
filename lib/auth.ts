/**
 * NextAuth v5 설정
 * Super Admin IP 화이트리스트 검증 + 본당 관리자/봉사자 로그인
 */
import NextAuth, { NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

/**
 * IP 화이트리스트 검증 (Super Admin 전용)
 * 환경변수 SUPER_ADMIN_ALLOWED_IPS에서 쉼표로 구분된 IP 목록 가져옴
 */
function isAllowedIP(ip: string | null): boolean {
  if (!ip) return false;
  const allowedIPs = process.env.SUPER_ADMIN_ALLOWED_IPS?.split(',') || [];
  return allowedIPs.includes(ip);
}

/**
 * NextAuth 설정
 */
export const authOptions: NextAuthConfig = {
  // Credentials provider 사용 시 adapter 불필요 (JWT strategy 사용)
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/auth/login',
    error: '/auth/login',
  },
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        role: { label: 'Role', type: 'text' }, // 'SUPER_ADMIN' | 'ADMIN' | 'VOLUNTEER'
        organizationId: { label: 'Organization ID', type: 'text' }, // 성당 선택용
      },
      async authorize(credentials, req) {
        const { email, password, role, organizationId } = credentials;

        // Super Admin 로그인
        if (role === 'SUPER_ADMIN') {
          // IP 주소 검증
          const ip =
            req.headers?.get('x-forwarded-for')?.split(',')[0].trim() ||
            req.headers?.get('x-real-ip') ||
            '127.0.0.1';

          if (!isAllowedIP(ip)) {
            throw new Error('접근이 허용되지 않은 IP 주소입니다.');
          }

          // 환경변수 기반 인증 (DB 저장 없음)
          if (
            email === process.env.SUPER_ADMIN_EMAIL &&
            password === process.env.SUPER_ADMIN_PASSWORD
          ) {
            return {
              id: 'super-admin',
              email: email as string,
              name: '총괄관리자',
              organizationId: null,
              role: 'SUPER_ADMIN',
            };
          }

          throw new Error('잘못된 인증 정보입니다.');
        }

        // 본당 관리자 및 봉사자 로그인 (DB 기반)
        // 이메일 형식인지 확인
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email as string);

        let user;

        if (isEmail) {
          // 이메일로 검색
          user = await prisma.user.findUnique({
            where: { email: email as string },
            include: { organization: true },
          });
        } else {
          // 이름으로 검색 (organizationId가 제공된 경우)
          if (organizationId) {
            user = await prisma.user.findFirst({
              where: {
                name: email as string, // email 필드에 이름이 전달됨
                organizationId: organizationId as string,
                status: 'ACTIVE',
              },
              include: { organization: true },
            });
          } else {
            throw new Error('성당을 선택해주세요.');
          }
        }

        if (!user) {
          throw new Error('사용자를 찾을 수 없습니다.');
        }

        if (user.status !== 'ACTIVE') {
          throw new Error('비활성화된 계정입니다.');
        }

        const isPasswordValid = await bcrypt.compare(
          password as string,
          user.password
        );

        if (!isPasswordValid) {
          throw new Error('잘못된 비밀번호입니다.');
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          organizationId: user.organizationId,
          role: user.role,
          isFirstLogin: user.isFirstLogin,
        };
      },
    }),
  ],
  callbacks: {
    // 미들웨어에서 호출되는 콜백 (NextAuth v5)
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isLoggedIn = !!auth?.user;

      // 인증이 필요한 경로
      const protectedPaths = ['/admin', '/super-admin', '/volunteer'];
      const isProtectedPath = protectedPaths.some((path) =>
        pathname.startsWith(path)
      );

      console.log('=== Authorized Callback ===');
      console.log('경로:', pathname);
      console.log('로그인 여부:', isLoggedIn);
      console.log('사용자:', auth?.user);

      // 보호된 경로는 인증 필요
      if (isProtectedPath) {
        return isLoggedIn;
      }

      // 그 외 경로는 인증 불필요
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.organizationId = user.organizationId;
        token.role = user.role;
        token.isFirstLogin = user.isFirstLogin;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.organizationId = token.organizationId as string | null;
        session.user.role = token.role as string;
        session.user.isFirstLogin = token.isFirstLogin as boolean;
      }
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authOptions);
