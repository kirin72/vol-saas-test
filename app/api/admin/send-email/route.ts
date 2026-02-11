/**
 * PDF 이메일 발송 API
 * 클라이언트에서 생성된 PDF(Base64)를 수신자 이메일로 발송
 * Resend API 사용
 */
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Resend } from 'resend';

// Resend 클라이언트 초기화
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    // 1. 인증 확인 (ADMIN 또는 총무 허용)
    const session = await auth();
    if (!session) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    // ADMIN이 아닌 경우, VOLUNTEER이고 총무인지 확인
    if (session.user.role !== 'ADMIN') {
      if (session.user.role === 'VOLUNTEER' && session.user.organizationId) {
        const org = await prisma.organization.findUnique({
          where: { id: session.user.organizationId },
          select: { treasurerId: true },
        });
        if (org?.treasurerId !== session.user.id) {
          return NextResponse.json(
            { error: '권한이 없습니다.' },
            { status: 403 }
          );
        }
      } else {
        return NextResponse.json(
          { error: '권한이 없습니다.' },
          { status: 403 }
        );
      }
    }

    // 2. 요청 데이터 파싱
    const body = await request.json();
    const { recipientEmail, pdfBase64, fileName, subject } = body;

    // 3. 입력 검증
    if (!recipientEmail || !pdfBase64 || !fileName || !subject) {
      return NextResponse.json(
        { error: '필수 항목이 누락되었습니다.' },
        { status: 400 }
      );
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      return NextResponse.json(
        { error: '올바른 이메일 주소를 입력해주세요.' },
        { status: 400 }
      );
    }

    // RESEND_API_KEY 확인
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: '이메일 서비스가 설정되지 않았습니다. 관리자에게 문의하세요.' },
        { status: 500 }
      );
    }

    // 4. Base64 → Buffer 변환
    const pdfBuffer = Buffer.from(pdfBase64, 'base64');

    // 5. 발신자 이메일 설정
    // Resend 무료 플랜: onboarding@resend.dev 사용
    // 커스텀 도메인 등록 시: noreply@{도메인} 사용 가능
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

    // 6. Resend로 이메일 발송
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [recipientEmail],
      subject: subject,
      html: `
        <div style="font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; padding: 20px;">
          <h2 style="color: #333;">${subject}</h2>
          <p style="color: #666;">
            ${session.user.name}님이 첨부파일을 보냈습니다.
          </p>
          <p style="color: #666; font-size: 14px;">
            첨부된 PDF 파일을 확인해주세요.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #999; font-size: 12px;">
            이 메일은 봉사 관리 시스템에서 자동으로 발송되었습니다.
          </p>
        </div>
      `,
      attachments: [
        {
          filename: fileName,
          content: pdfBuffer,
        },
      ],
    });

    // 7. 에러 처리
    if (error) {
      console.error('[이메일] 발송 실패:', error);
      return NextResponse.json(
        { error: `이메일 발송에 실패했습니다: ${error.message}` },
        { status: 500 }
      );
    }

    // 8. 성공 응답
    return NextResponse.json({
      success: true,
      messageId: data?.id,
    });
  } catch (err) {
    console.error('[이메일] 서버 에러:', err);
    return NextResponse.json(
      { error: '이메일 발송 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
