export interface Credentials {
  apiUrl: string;
  idInstance: string;
  apiTokenInstance: string;
}

export type InstanceState =
  | "authorized"
  | "notAuthorized"
  | "blocked"
  | "suspended"
  | "starting"
  | "pendingPassword"
  | "unknown";

export interface ConnectionResult {
  kind: "success" | "warning" | "error";
  message: string;
  state?: InstanceState;
}
