import type { Recipient } from "../types/api";

export function parseRecipient(input: string): Recipient | null {
  const value = input.trim();
  if (/^@[a-zA-Z][a-zA-Z0-9_]{4,31}$/.test(value)) {
    const username = value.toLowerCase();
    return { address: username, request: { username } };
  }

  if (!/^\+[\d\s()-]+$/.test(value)) return null;

  const phone = value.replace(/[\s()-]/g, "");

  // Только Беларусь и Россия, исключая Казахстан
  if (!/^\+375\d{9}$/.test(phone) && !/^\+7[3489]\d{9}$/.test(phone))
    return null;

  return { address: phone, request: { phoneNumber: Number(phone.slice(1)) } };
}

export const recipientFormatMessage =
  "Введите номер Беларуси (+375 и 9 цифр) или России (+7 и 10 цифр, кроме кодов Казахстана), либо @username: 5–32 латинских символа, цифры и _, начиная с буквы.";
