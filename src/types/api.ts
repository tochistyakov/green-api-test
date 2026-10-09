import type { Diagnostic } from "./connection";

export type CheckAccountRequest =
  | { username: string; phoneNumber?: never }
  | { phoneNumber: number; username?: never };

export type CheckAccountResponse =
  | { exist: false }
  | { exist: true; chatId: string };

export type CheckAccountResult =
  | { ok: true; account: CheckAccountResponse; diagnostic: Diagnostic }
  | { ok: false; message: string; diagnostic: Diagnostic };

export interface Recipient {
  address: string;
  request: CheckAccountRequest;
}

export interface CreateChatResult {
  message?: string;
  diagnostic?: Diagnostic;
}

export interface SendMessageRequest {
  chatId: string;
  message: string;
}

export type SendMessageResult =
  | { ok: true; idMessage: string }
  | { ok: false; message: string; outcomeUnknown: boolean };
