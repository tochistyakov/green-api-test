import { useState, useSyncExternalStore } from "react";
import { createChatStore } from "../services/chatStore";

export function useChatStore() {
  const [store] = useState(createChatStore);
  const chats = useSyncExternalStore(store.subscribe, store.get);
  
  return { chats, setChats: store.set, processNotification: store.process };
}
