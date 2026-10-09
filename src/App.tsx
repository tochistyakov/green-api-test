import { useState } from "react";
import { ConnectionPage } from "./pages/ConnectionPage";
import { ChatPage } from "./pages/ChatPage";
import type { Credentials } from "./types/connection";

export default function App() {
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  return credentials ? (
    <ChatPage
      key={`${credentials.apiUrl}|${credentials.idInstance}`}
      credentials={credentials}
      onDisconnect={() => setCredentials(null)}
    />
  ) : (
    <ConnectionPage onConnected={setCredentials} />
  );
}
