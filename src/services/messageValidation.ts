export const MAX_MESSAGE_LENGTH = 4096;

export function messageLength(text: string): number {
  return Array.from(text).length;
}

export function validateMessage(text: string): string | null {
  if (!text.trim()) {
    return "Введите текст сообщения.";
  }
  if (messageLength(text) > MAX_MESSAGE_LENGTH) {
    return "Максимальная длина сообщения — 4096 символов.";
  }
  return null;
}
