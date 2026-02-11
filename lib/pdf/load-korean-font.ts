/**
 * 한글 폰트 로드 유틸리티
 * NotoSansKR 폰트를 동적으로 fetch하여 jsPDF에 등록
 * 메모리 캐싱으로 중복 로드 방지
 */
import type { jsPDF } from 'jspdf';

// Base64 변환된 폰트 데이터를 메모리에 캐싱
let cachedFontBase64: string | null = null;

/**
 * ArrayBuffer → Base64 문자열 변환
 * 대용량 파일(10MB+)에서 stack overflow 방지를 위해 chunk 단위로 처리
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  // 8KB 단위로 나누어 변환 (stack overflow 방지)
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

/**
 * NotoSansKR 폰트를 jsPDF 인스턴스에 등록
 * public/fonts/NotoSansKR-Regular.ttf를 fetch로 동적 로드
 * @param doc jsPDF 인스턴스
 */
export async function registerKoreanFont(doc: jsPDF): Promise<void> {
  // 캐시된 폰트가 없으면 fetch로 로드
  if (!cachedFontBase64) {
    const response = await fetch('/fonts/NotoSansKR-Regular.ttf');
    if (!response.ok) {
      throw new Error(`폰트 로드 실패: ${response.status} ${response.statusText}`);
    }
    const buffer = await response.arrayBuffer();
    cachedFontBase64 = arrayBufferToBase64(buffer);
  }

  // jsPDF 가상 파일 시스템에 폰트 등록
  doc.addFileToVFS('NotoSansKR-Regular.ttf', cachedFontBase64);
  // 폰트 패밀리 등록 (normal + bold 스타일 모두 등록, bold 미지원 시 fallback 방지)
  doc.addFont('NotoSansKR-Regular.ttf', 'NotoSansKR', 'normal');
  doc.addFont('NotoSansKR-Regular.ttf', 'NotoSansKR', 'bold');
  // 기본 폰트로 설정
  doc.setFont('NotoSansKR');
}
