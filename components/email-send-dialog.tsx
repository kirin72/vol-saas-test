/**
 * 이메일 발송 다이얼로그 컴포넌트
 * PDF를 수신자 이메일로 발송하는 공통 다이얼로그
 * 배정표/입출금 PDF 모두에서 재사용
 */
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Loader2 } from 'lucide-react';

interface EmailSendDialogProps {
  // 다이얼로그 열림/닫힘 상태
  open: boolean;
  // 닫힘 콜백
  onOpenChange: (open: boolean) => void;
  // PDF Blob 생성 함수 (호출 시점에 Blob 반환)
  generatePdfBlob: () => Promise<Blob>;
  // PDF 파일명 (예: "2026년_2월_입출금내역.pdf")
  fileName: string;
  // 이메일 제목 (예: "2026년 2월 입출금내역")
  subject: string;
}

export function EmailSendDialog({
  open,
  onOpenChange,
  generatePdfBlob,
  fileName,
  subject,
}: EmailSendDialogProps) {
  // 수신자 이메일 입력값
  const [email, setEmail] = useState('');
  // 발송 중 상태
  const [sending, setSending] = useState(false);
  // 에러 메시지
  const [error, setError] = useState('');

  // 이메일 발송 처리
  const handleSend = async () => {
    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      setError('올바른 이메일 주소를 입력해주세요.');
      return;
    }

    setSending(true);
    setError('');

    try {
      // 1. PDF Blob 생성
      const blob = await generatePdfBlob();

      // 2. Blob → Base64 변환
      const arrayBuffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      const chunkSize = 8192;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
      }
      const pdfBase64 = btoa(binary);

      // 3. API 호출
      const response = await fetch('/api/admin/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail: email.trim(),
          pdfBase64,
          fileName,
          subject,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '이메일 발송에 실패했습니다.');
      }

      // 4. 성공
      alert(`${email}으로 이메일이 발송되었습니다.`);
      // 초기화 후 닫기
      setEmail('');
      onOpenChange(false);
    } catch (err) {
      console.error('[이메일] 발송 실패:', err);
      setError(err instanceof Error ? err.message : '이메일 발송에 실패했습니다.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            PDF 이메일 발송
          </DialogTitle>
          <DialogDescription>
            {subject}을(를) 이메일로 보냅니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 수신자 이메일 입력 */}
          <div className="space-y-2">
            <Label htmlFor="recipient-email">수신자 이메일</Label>
            <Input
              id="recipient-email"
              type="email"
              placeholder="example@email.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(''); // 입력 시 에러 초기화
              }}
              onKeyDown={(e) => {
                // Enter키로 발송
                if (e.key === 'Enter' && !sending) handleSend();
              }}
              disabled={sending}
            />
            {/* 에러 메시지 */}
            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}
          </div>

          {/* 파일명 표시 */}
          <div className="text-sm text-gray-500">
            첨부파일: {fileName}
          </div>
        </div>

        {/* 버튼 영역 */}
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={sending}
          >
            취소
          </Button>
          <Button
            onClick={handleSend}
            disabled={sending || !email.trim()}
          >
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                발송 중...
              </>
            ) : (
              <>
                <Mail className="w-4 h-4 mr-2" />
                이메일 발송
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
