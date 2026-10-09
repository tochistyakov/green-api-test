import { useEffect, useRef, useState } from "react";
import { getStateInstance } from "../services/greenApi";
import type { ConnectionResult, Credentials } from "../types/connection";

export function useConnection(onConnected: (credentials: Credentials) => void) {
  const [result, setResult] = useState<ConnectionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const active = useRef<AbortController | null>(null);

  useEffect(() => () => active.current?.abort(), []);

  function reset() {
    active.current?.abort();
    active.current = null;
    setLoading(false);
    setResult(null);
  }

  async function check(credentials: Credentials) {
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setLoading(true);
    setResult(null);
    const next = await getStateInstance(credentials, controller.signal);

    if (active.current !== controller || controller.signal.aborted) return;

    active.current = null;
    setResult(next);
    setLoading(false);

    if (next.kind === "success" && next.state === "authorized") {
      onConnected({ ...credentials });
    }
  }

  return { result, loading, check, reset };
}
