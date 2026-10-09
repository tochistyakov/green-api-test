import { CircleHelp, Send } from "lucide-react";
import { ConnectionForm } from "../components/ConnectionForm";
import { useConnection } from "../hooks/useConnection";
import styles from "./ConnectionPage.module.css";
import type { Credentials } from "../types/connection";

export function ConnectionPage({
  onConnected,
}: {
  onConnected: (credentials: Credentials) => void;
}) {
  const { result, loading, check, reset } = useConnection(onConnected);

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="form-title">
        <div className={styles.cardTop}>
          <span className={styles.telegram}>
            <Send size={25} aria-hidden="true" />
          </span>

          <span className={styles.badge}>
            {loading ? "Подключаемся…" : "GREEN-API · Telegram"}
          </span>
        </div>

        <h1 id="form-title" className={styles.cardTitle}>
          Подключение к Telegram
        </h1>

        <p className={styles.cardDescription}>
          Введите параметры авторизованного инстанса из личного кабинета
          GREEN-API.
        </p>

        <ConnectionForm loading={loading} onSubmit={check} onChange={reset} />

        {loading && (
          <div className={styles.loading} role="status">
            Ожидаем ответ, до 15 секунд.{" "}
            <button type="button" onClick={reset}>
              Отменить
            </button>
          </div>
        )}

        {result && (
          <div
            className={styles.feedback}
            data-kind={result.kind}
            role={result.kind === "error" ? "alert" : "status"}
          >
            {result.message}
          </div>
        )}

        <a
          className={styles.help}
          href="https://green-api.com/telegram/docs/before-start/"
          target="_blank"
          rel="noreferrer"
        >
          <CircleHelp size={16} aria-hidden="true" /> Где взять параметры
          подключения?
        </a>
      </section>
    </main>
  );
}
