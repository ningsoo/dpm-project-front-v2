/**
 * 토스 결제 에러 메시지를 사용자용 문구로 변환한다.
 * JSON/코드 문자열이 그대로 노출되지 않도록 code 기반 매핑만 반환한다.
 */

const TOSS_CODE_TO_MESSAGE: Record<string, string> = {
  USER_CANCEL: '결제가 취소되었습니다.',
  CANCELED: '결제가 취소되었습니다.',
  NETWORK_ERROR: '네트워크 문제로 결제 요청에 실패했습니다. 다시 시도해주세요.',
  TIMEOUT: '네트워크 문제로 결제 요청에 실패했습니다. 다시 시도해주세요.',
  FORBIDDEN_REQUEST: '결제 정보 검증에 실패했습니다. 다시 시도해주세요.',
  UNAUTHORIZED: '로그인이 필요합니다. 다시 로그인해주세요.',
  COMMON_UNAUTHORIZED: '로그인이 필요합니다. 다시 로그인해주세요.',
  COMMON_INVALID_API_KEY: '결제 설정 오류가 발생했습니다. 관리자에게 문의해주세요.',
  REJECT_CARD_COMPANY: '카드 결제가 승인되지 않았습니다. 다른 결제수단을 이용해주세요.',
  EXECUTE_PAY_NOT_APPROVED: '결제가 완료되지 않았습니다. 다시 시도해주세요.',
  COMMON_BREAK_TIME_OF_BANK: '은행 점검 시간입니다. 잠시 후 다시 시도해주세요.',
  PAUSE_USER: '결제를 진행할 수 없는 상태입니다. 관리자에게 문의해주세요.',
  REFUND_EXCEED_DAILY: '환불 한도를 초과했습니다. 관리자에게 문의해주세요.',
};

const DEFAULT_MESSAGE = '결제 처리 중 오류가 발생했습니다. 다시 시도해주세요.';

const CODE_REGEX = /code"\s*:\s*"([A-Z0-9_]+)"/;

function extractCodeFromString(str: string): string | null {
  const trimmed = str.trim();
  if (!trimmed) return null;

  // 케이스 A/B: JSON 조각 추출 시도 — 첫 "{" 부터 마지막 "}" 까지
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const candidate = trimmed.slice(firstBrace, lastBrace + 1);
    try {
      const parsed = JSON.parse(candidate) as { code?: string; message?: string };
      if (typeof parsed?.code === 'string' && parsed.code.trim() !== '') {
        return parsed.code.trim();
      }
    } catch {
      // parse 실패 시 정규식으로 code만 추출
    }
  }

  // 케이스 C: 정규식으로 code 추출
  const match = str.match(CODE_REGEX);
  if (match && match[1]) return match[1];

  return null;
}

/**
 * 토스 에러 메시지를 사용자용 문구로 변환한다.
 * @param input - 토스/백엔드에서 내려온 에러 메시지(문자열 또는 객체)
 * @returns 사용자 문구 또는 null(토스 구조가 아니면 null → 기존 흐름 유지)
 */
export function toUserFriendlyTossMessage(input: unknown): string | null {
  if (typeof input !== 'string') return null;

  const code = extractCodeFromString(input);
  if (code == null) return null;

  return TOSS_CODE_TO_MESSAGE[code] ?? DEFAULT_MESSAGE;
}
