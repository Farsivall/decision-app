const SESSION_KEY = "aql_session_id";

export function getSessionId(): string {
  let id =
    typeof localStorage !== "undefined" ? localStorage.getItem(SESSION_KEY) : null;
  if (!id) {
    id =
      crypto.randomUUID?.() ??
      `anon_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    try {
      localStorage.setItem(SESSION_KEY, id);
    } catch {
      /* ignore */
    }
  }
  return id;
}
