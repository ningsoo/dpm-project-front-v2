/**
 * Auth 관련 입력 검증 유틸 (회원가입 기준 공통)
 */

const EMAIL_FULL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HANGUL_REGEX = /[\uAC00-\uD7A3\u1100-\u11FF\u1160-\u11FF\u3130-\u318F]/;

/**
 * 이메일 입력 정규화 + 한글 감지
 * - value: raw에서 한글(완성형/자모) 제거한 문자열
 * - hadKorean: raw에 한글이 포함되었으면 true (에러 메시지 즉시 표시용)
 */
export function sanitizeEmailInput(raw: string): { value: string; hadKorean: boolean } {
  const value = raw.replace(HANGUL_REGEX, '');
  const hadKorean = raw !== value;
  return { value, hadKorean };
}

/**
 * 이메일 UX용 검증 (@ 없으면 형식 오류 숨김, @ 이후에만 정규식 검사)
 * - error: 형식 오류 메시지 (빈 문자열이면 없음)
 * - canProceed: 버튼 활성 등 진행 가능 여부
 */
export function validateEmailForUX(value: string): { error: string; canProceed: boolean } {
  if (value === '') return { error: '', canProceed: false };
  if (!value.includes('@')) return { error: '', canProceed: false };
  if (EMAIL_FULL_REGEX.test(value)) return { error: '', canProceed: true };
  return { error: '올바른 이메일 형식이 아닙니다', canProceed: false };
}

/**
 * 비밀번호 입력 정규화 (공백 제거)
 */
export function normalizePasswordInput(raw: string): string {
  return raw.replace(/\s/g, '');
}

/**
 * 비밀번호 회원가입 규칙 검증
 * - 반환: 부족한 조건 목록 (빈 배열이면 통과)
 */
export function validatePasswordBySignupRule(value: string): string[] {
  const err: string[] = [];
  if (value.length < 10) err.push('10자 이상');
  if (!/[A-Z]/.test(value)) err.push('대문자 포함');
  if (!/[0-9]/.test(value)) err.push('숫자 포함');
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) err.push('특수문자 포함');
  if (/[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(value)) err.push('한글 금지');
  return err;
}

/**
 * 닉네임 형식 검증 (회원가입 규칙과 동일)
 * - 우선순위: 공백 > 특수문자(언더스코어 제외) > 한글 자음/모음 단독
 * - 반환: 에러 메시지 또는 ''
 */
export function validateNicknameFormatBySignupRule(value: string): string {
  if (!value) return '';
  if (/\s/.test(value)) return '공백은 입력할 수 없습니다';
  if (/[^a-zA-Z0-9가-힣_]/.test(value)) return '특수문자는 입력할 수 없습니다';
  if (/[\u3130-\u318F]/.test(value)) return '한글은 완성형으로 입력해 주세요';
  return '';
}

/**
 * 연락처 3부 검증 (앞자리 010~019, 중간/끝 각 4자리 숫자)
 */
export function validatePhoneParts(
  part0: string,
  part1: string,
  part2: string
): { ok: boolean; error: string } {
  const ok =
    /^01[0-9]$/.test(part0) &&
    part1.length === 4 &&
    /^\d+$/.test(part1) &&
    part2.length === 4 &&
    /^\d+$/.test(part2);
  return {
    ok,
    error: ok ? '' : '연락처를 올바르게 입력해 주세요',
  };
}
