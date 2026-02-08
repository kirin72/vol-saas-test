/**
 * NextAuth API Route Handler
 * GET /api/auth/* 및 POST /api/auth/* 요청 처리
 */
import { handlers } from '@/lib/auth';

export const { GET, POST } = handlers;
