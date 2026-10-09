import { useState } from "react";
import type { FormEvent } from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
} from "lucide-react";
import type { Credentials } from "../types/connection";
import styles from "./ConnectionForm.module.css";

interface Props {
  loading: boolean;
  onSubmit: (credentials: Credentials) => Promise<void>;
  onChange: () => void;
}

export function ConnectionForm({ loading, onSubmit, onChange }: Props) {
  const [values, setValues] = useState<Credentials>({
    apiUrl: "",
    idInstance: "",
    apiTokenInstance: "",
  });
  const [visible, setVisible] = useState(false);

  function update(field: keyof Credentials, value: string) {
    onChange();
    setValues((previous) => ({ ...previous, [field]: value }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setVisible(false);
    void onSubmit(values);
  }

  return (
    <form
      className={styles.form}
      onSubmit={submit}
      autoComplete="off"
      aria-busy={loading}
    >
      <label htmlFor="api-url">API URL</label>
      <input
        id="api-url"
        type="url"
        required
        placeholder="https://…"
        value={values.apiUrl}
        onChange={(e) => update("apiUrl", e.target.value)}
        spellCheck={false}
        autoCapitalize="none"
        aria-describedby="url-help"
      />
      <small id="url-help">
        Скопируйте адрес хоста из личного кабинета GREEN-API.
      </small>

      <label htmlFor="instance-id">ID Instance</label>
      <input
        id="instance-id"
        type="text"
        inputMode="numeric"
        pattern="[0-9]+"
        required
        placeholder="Номер вашего инстанса"
        value={values.idInstance}
        onChange={(e) => update("idInstance", e.target.value)}
        autoCapitalize="none"
        spellCheck={false}
      />

      <label htmlFor="instance-token">API Token Instance</label>
      <div className={styles.password}>
        <input
          id="instance-token"
          type={visible ? "text" : "password"}
          required
          placeholder="Ключ доступа к инстансу"
          autoComplete="new-password"
          autoCapitalize="none"
          spellCheck={false}
          value={values.apiTokenInstance}
          onChange={(e) => update("apiTokenInstance", e.target.value)}
          aria-describedby="token-help"
        />
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          aria-label={visible ? "Скрыть токен" : "Показать токен"}
          aria-pressed={visible}
        >
          {visible ? <EyeOff size={19} /> : <Eye size={19} />}
        </button>
      </div>

      <small id="token-help" className={styles.note}>
        <LockKeyhole size={14} /> Данные хранятся только в памяти этой страницы.
      </small>

      <button className={styles.submit} type="submit" disabled={loading}>
        {loading ? (
          <>
            <LoaderCircle className={styles.spinner} size={19} /> Проверяем
            подключение…
          </>
        ) : (
          <>
            Подключиться <ArrowRight size={19} />
          </>
        )}
      </button>
    </form>
  );
}
