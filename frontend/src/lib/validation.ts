export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;

export const PASSWORD_HINT =
  "8자 이상, 영문 대문자/소문자/숫자/특수문자(!@#$%^&*)를 각각 1개 이상 포함해야 합니다.";

export function validateEmail(email: string): string | null {
  if (!email) return "이메일을 입력해 주세요.";
  if (!EMAIL_REGEX.test(email)) return "올바른 이메일 형식이 아닙니다.";
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return "비밀번호를 입력해 주세요.";
  if (!PASSWORD_REGEX.test(password)) return PASSWORD_HINT;
  return null;
}

export function validateNickname(nickname: string): string | null {
  if (!nickname.trim()) return "닉네임을 입력해 주세요.";
  if (nickname.length < 2) return "닉네임은 2자 이상이어야 합니다.";
  if (nickname.length > 20) return "닉네임은 20자 이하여야 합니다.";
  return null;
}
