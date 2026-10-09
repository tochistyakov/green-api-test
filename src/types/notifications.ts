export type DeliveryStatus = "delivered" | "read" | "failed" | "noAccount";

export interface NotificationEnvelope {
  receiptId: number;
  body: unknown;
}

export type NotificationEvent =
  | { kind: "skip" }
  | { kind: "unauthorized" }
  | {
      kind: "incoming";
      chatId: string;
      idMessage: string;
      timestamp: number;
      text: string;
      name: string;
    }
  | {
      kind: "status";
      chatId: string;
      idMessage: string;
      timestamp: number;
      status: DeliveryStatus;
    };

export interface PollingState {
  phase: "waiting" | "receiving" | "backoff" | "stopped";
  message: string;
  canRetry?: boolean;
}

export type NotificationProcessor = (body: unknown) => void | "unauthorized";


export interface PollingDependencies {
  receive: () => Promise<NotificationEnvelope | null>;
  remove: (receiptId: number) => Promise<void>;
  process: NotificationProcessor;
  report: (state: PollingState) => void;
  wait?: (ms: number, signal: AbortSignal) => Promise<void>;
}