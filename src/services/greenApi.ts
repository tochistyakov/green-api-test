import { apiFetch, createRequestScope } from "./apiTransport";
import type {
  ConnectionResult,
  Credentials,
  InstanceState,
} from "../types/connection";
import type {
  CheckAccountRequest,
  CheckAccountResult,
  SendMessageRequest,
  SendMessageResult,
} from "../types/api";
import { validateMessage } from "./messageValidation";
import type { NotificationEnvelope } from "../types/notifications";
import { PollingError } from "./pollingError";
import { parseRecipient } from "./recipient";

const stateMessages: Record<InstanceState, string> = {
  authorized: "Инстанс авторизован. Подключение к Telegram подтверждено.",
  notAuthorized:
    "Инстанс не авторизован. Завершите вход в Telegram в личном кабинете GREEN-API, затем повторите проверку.",
  blocked:
    "Аккаунт Telegram заблокирован. Проверьте состояние аккаунта и обратитесь в поддержку.",
  suspended:
    "На аккаунте действуют временные ограничения. Проверьте их срок в личном кабинете GREEN-API.",
  starting:
    "Инстанс запускается. Подождите до 5 минут и повторите проверку. Если статус не меняется, обратитесь в поддержку.",
  pendingPassword:
    "Для завершения авторизации требуется пароль 2FA. Завершите авторизацию через GREEN-API, затем повторите проверку.",
  unknown:
    "API вернул неизвестное состояние инстанса. Проверьте актуальную документацию или обратитесь в поддержку.",
};

export function validateCredentials(value: Credentials): string | null {
  let url: URL;

  try {
    url = new URL(value.apiUrl.trim());
  } catch {
    return "Укажите корректный API URL из личного кабинета GREEN-API.";
  }

  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
  ) {
    return "API URL должен быть HTTPS-адресом хоста, без пути, параметров, логина и пароля.";
  }

  if (url.origin === window.location.origin) {
    return "Укажите внешний хост GREEN-API, а не адрес этого приложения.";
  }

  if (!/^\d+$/.test(value.idInstance.trim())) {
    return "ID Instance должен содержать только цифры.";
  }

  const token = value.apiTokenInstance.trim();

  if (!token || /\s/.test(token) || token === "." || token === "..") {
    return "Укажите API Token Instance без пробелов и переносов строк.";
  }

  return null;
}

function httpMessage(status: number): string {
  switch (status) {
    case 469:
      return "Telegram временно ограничил поиск контактов. Прекратите проверки и повторите вручную через несколько часов.";

    case 401:
    case 403:
      return "Доступ отклонён. Проверьте ID Instance, API Token Instance и доступность инстанса.";

    case 404:
      return "Инстанс или метод не найден. Проверьте API URL и ID Instance.";

    case 429:
      return "Превышена частота запросов. Подождите и повторите проверку.";

    default:
      if (status >= 500) {
        return "Сервис GREEN-API временно недоступен. Повторите проверку позже.";
      }

      return "API отклонил запрос. Проверьте параметры подключения и состояние инстанса.";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function queueRequest(
  credentials: Credentials,
  method: "receiveNotification" | "deleteNotification",
  signal: AbortSignal,
  receiptId?: number,
): Promise<unknown> {
  if (validateCredentials(credentials)) {
    throw new PollingError(
      "configuration",
      "Проверьте параметры подключения и подключитесь заново.",
    );
  }

  const scope = createRequestScope(
    signal,
    method === "receiveNotification" ? 40_000 : 15_000,
  );

  try {
    const suffix =
      method === "receiveNotification" ? "?receiveTimeout=30" : "/" + receiptId;

    const response = await apiFetch(
      credentials,
      method,
      scope.signal,
      {
        method: method === "receiveNotification" ? "GET" : "DELETE",
      },
      suffix,
    );

    if (response.status === 401 || response.status === 403) {
      throw new PollingError(
        "auth",
        "Приём остановлен: доступ отклонён. Проверьте токен и авторизацию, затем подключитесь заново.",
      );
    }

    if (response.status === 400 || response.status === 404) {
      throw new PollingError(
        "configuration",
        "Приём остановлен: проверьте параметры инстанса и очистите webhookUrl в кабинете GREEN-API для HTTP polling.",
      );
    }

    if (!response.ok) {
      throw new PollingError(
        "transient",
        response.status === 429 || response.status === 469
          ? "API ограничил частоту запросов."
          : "Сервис получения уведомлений временно недоступен.",
      );
    }

    const text = await response.text();
    if (method === "receiveNotification" && !text.trim()) {
      return null;
    }

    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      throw new PollingError(
        "invalid",
        "Некорректный JSON уведомления или подтверждения. Уведомление не подтверждено.",
      );
    }

    if (isRecord(data) && data.status === false) {
      if (data.reason === "instance is starting or not authorized") {
        throw new PollingError(
          "auth",
          "Инстанс не авторизован или запускается. Подключитесь заново после авторизации.",
        );
      }

      throw new PollingError(
        "transient",
        "API отклонил операцию с очередью уведомлений.",
      );
    }

    return data;
  } catch (error) {
    if (error instanceof PollingError) {
      throw error;
    }

    throw new PollingError(
      "transient",
      "Нет доступного ответа: сеть, таймаут или CORS. Проверьте GET и DELETE/OPTIONS в DevTools.",
    );
  } finally {
    scope.dispose();
  }
}

export async function receiveNotification(
  credentials: Credentials,
  signal: AbortSignal,
): Promise<NotificationEnvelope | null> {
  const data = await queueRequest(credentials, "receiveNotification", signal);
  if (data === null) {
    return null;
  }

  if (
    !isRecord(data) ||
    !Number.isSafeInteger(data.receiptId) ||
    (data.receiptId as number) < 0 ||
    !("body" in data)
  ) {
    throw new PollingError(
      "invalid",
      "Некорректный конверт уведомления. Удаление не выполнено.",
    );
  }

  return { receiptId: data.receiptId as number, body: data.body };
}

export async function deleteNotification(
  credentials: Credentials,
  receiptId: number,
  signal: AbortSignal,
): Promise<void> {
  if (!Number.isSafeInteger(receiptId) || receiptId < 0) {
    throw new PollingError(
      "invalid",
      "Некорректный receiptId. Удаление не выполнено.",
    );
  }

  const data = await queueRequest(
    credentials,
    "deleteNotification",
    signal,
    receiptId,
  );

  if (!isRecord(data) || data.result !== true) {
    throw new PollingError(
      "invalid",
      "Удаление уведомления не подтверждено API. Возможно, очередь читает другой клиент.",
    );
  }
}

export async function sendMessage(
  credentials: Credentials,
  request: SendMessageRequest,
  signal: AbortSignal,
): Promise<SendMessageResult> {
  const invalid =
    validateCredentials(credentials) ?? validateMessage(request.message);

  if (invalid || !/^-?[1-9]\d*$/.test(request.chatId)) {
    return {
      ok: false,
      message: invalid ?? "Некорректный идентификатор чата.",
      outcomeUnknown: false,
    };
  }

  if (signal.aborted) {
    return { ok: false, message: "Отправка отменена.", outcomeUnknown: false };
  }

  const scope = createRequestScope(signal);

  const fail = (
    message: string,
    outcomeUnknown = false,
  ): SendMessageResult => ({ ok: false, message, outcomeUnknown });

  try {
    const response = await apiFetch(credentials, "sendMessage", scope.signal, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      switch (response.status) {
        case 400:
          return fail("API отклонил сообщение. Проверьте текст и получателя.");

        case 429:
        case 469:
          return fail(
            "Достигнут лимит отправки. Подождите перед ручным повтором.",
          );

        case 408:
          return fail(httpMessage(response.status), true);

        default:
          if (response.status >= 500) {
            return fail(
              "Ошибка сервера GREEN-API. Подтверждение постановки в очередь не получено.",
              true,
            );
          }

          return fail(httpMessage(response.status));
      }
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      if (scope.signal.aborted) {
        throw new Error("aborted");
      }

      return fail(
        "API вернул некорректный JSON. Постановка сообщения в очередь не подтверждена.",
        true,
      );
    }
    if (
      !isRecord(data) ||
      data.status === false ||
      typeof data.idMessage !== "string" ||
      !data.idMessage.trim()
    ) {
      return fail(
        "API не вернул подтверждение с idMessage. Постановка в очередь не подтверждена.",
        true,
      );
    }

    return { ok: true, idMessage: data.idMessage };
  } catch {
    return fail(
      scope.timedOut
        ? "Не получен ответ за 15 секунд. Сервер мог принять сообщение."
        : signal.aborted
          ? "Ожидание отменено. Сервер мог принять сообщение."
          : "Ответ недоступен: возможны сеть, CORS, DNS или TLS. Проверьте Network в DevTools.",
      true,
    );
  } finally {
    scope.dispose();
  }
}

export async function checkAccount(
  credentials: Credentials,
  request: CheckAccountRequest,
  signal: AbortSignal,
): Promise<CheckAccountResult> {
  const fail = (message: string): CheckAccountResult => ({
    ok: false,
    message,
  });
  const validation = validateCredentials(credentials);
  const recipient = parseRecipient(
    request.username ?? `+${request.phoneNumber}`,
  );

  if (
    validation ||
    !recipient ||
    (request.username !== undefined && request.phoneNumber !== undefined)
  ) {
    return {
      ok: false,
      message: validation ?? "Некорректный получатель.",
    };
  }

  const scope = createRequestScope(signal);
  try {
    const response = await apiFetch(credentials, "checkAccount", scope.signal, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(recipient.request),
    });

    if (!response.ok) {
      return fail(httpMessage(response.status));
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      if (scope.signal.aborted) {
        throw new Error("aborted");
      }

      return fail("API вернул некорректный JSON. Получатель не добавлен.");
    }

    if (!isRecord(data)) {
      return fail("Некорректная структура ответа CheckAccount.");
    }

    if (data.status === false) {
      if (
        (isRecord(data.data) && data.data.reason === "rate_limit_exceeded") ||
        data.reason === "rate_limit_exceeded"
      ) {
        return fail(
          "Достигнут лимит проверки номеров Telegram. Приостановите проверки минимум на 2 часа. Автоматических повторов нет.",
        );
      }

      if (data.reason === "Rate limited by messenger") {
        return fail(httpMessage(469));
      }

      if (data.reason === "instance is starting or not authorized") {
        return fail(
          "Инстанс запускается или не авторизован. Завершите авторизацию в GREEN-API и подключитесь заново.",
        );
      }

      if (data.reason === "Messenger is temporarily unavailable") {
        return fail(
          "Telegram временно недоступен. Повторите проверку вручную позже.",
        );
      }

      return fail(
        "GREEN-API не смог проверить получателя. Проверьте состояние инстанса и параметры запроса.",
      );
    }

    if (data.exist === false) {
      return { ok: true, account: { exist: false } };
    }

    if (
      data.exist !== true ||
      typeof data.chatId !== "string" ||
      !/^[1-9]\d*$/.test(data.chatId)
    ) {
      return fail(
        "API не вернул корректный chatId личного чата. Получатель не добавлен.",
      );
    }

    return {
      ok: true,
      account: { exist: true, chatId: data.chatId },
    };
  } catch {
    return fail(
      scope.timedOut
        ? "Проверка заняла больше 15 секунд. Запрос отменён; повторите вручную позже."
        : signal.aborted
          ? "Проверка отменена."
          : "Ответ CheckAccount недоступен браузеру. Возможны CORS, сеть, DNS или TLS.",
    );
  } finally {
    scope.dispose();
  }
}

export async function getStateInstance(
  credentials: Credentials,
  signal: AbortSignal,
): Promise<ConnectionResult> {
  const validation = validateCredentials(credentials);
  if (validation) {
    return {
      kind: "error",
      message: validation,
    };
  }

  const scope = createRequestScope(signal);
  try {
    const response = await apiFetch(
      credentials,
      "getStateInstance",
      scope.signal,
      { method: "GET" },
    );

    if (!response.ok) {
      return {
        kind: "error",
        message: httpMessage(response.status),
      };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      if (scope.signal.aborted) {
        throw new Error("aborted");
      }

      return {
        kind: "error",
        message:
          "Ответ получен, но не содержит корректный JSON. Проверьте API URL.",
      };
    }

    if (
      !data ||
      typeof data !== "object" ||
      !("stateInstance" in data) ||
      typeof data.stateInstance !== "string" ||
      !data.stateInstance
    ) {
      return {
        kind: "error",
        message:
          "Ответ API не содержит строковое поле stateInstance. Проверьте API URL.",
      };
    }

    const state: InstanceState = Object.hasOwn(
      stateMessages,
      data.stateInstance,
    )
      ? (data.stateInstance as InstanceState)
      : "unknown";
    return {
      kind: state === "authorized" ? "success" : "warning",
      state,
      message: stateMessages[state],
    };
  } catch {
    const message = scope.timedOut
      ? "Сервис не ответил за 15 секунд. Проверьте сеть и повторите попытку."
      : signal.aborted
        ? "Проверка отменена."
        : "Браузер не получил доступный ответ. Возможны CORS, проблемы сети, DNS, TLS, блокировка расширением или перенаправление. Уточните причину в DevTools.";
    return { kind: "error", message };
  } finally {
    scope.dispose();
  }
}
