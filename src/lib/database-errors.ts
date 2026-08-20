type DatabaseError = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
  status?: number | null;
};

export const databaseErrorMessages: Record<string, string> = {
  database_network_error: "The database could not be reached. Check your connection and try again.",
  database_permission_error: "Supabase denied this operation. Your admin session or database permission may need attention.",
  database_constraint_error: "This change conflicts with an existing or related record. Review the selected values and try again.",
  database_service_error: "Supabase is temporarily unavailable or timed out. Please wait a moment and try again.",
};

export function databaseErrorCode(error: unknown, fallback = "save_failed") {
  if (!error || typeof error !== "object") return fallback;

  const value = error as DatabaseError;
  const code = String(value.code ?? "").toUpperCase();
  const message = [value.message, value.details, value.hint]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const status = Number(value.status ?? 0);

  if (
    status === 401 ||
    status === 403 ||
    code === "42501" ||
    code === "PGRST301" ||
    /permission denied|not authorized|unauthorized|row-level security|rls policy|jwt expired/.test(message)
  ) return "database_permission_error";

  if (
    /failed to fetch|fetch failed|network|econnreset|econnrefused|enotfound|socket|dns/.test(message)
  ) return "database_network_error";

  if (
    status >= 500 ||
    ["PGRST000", "PGRST001", "PGRST002", "PGRST003", "57014", "57P01", "57P02", "57P03", "53300"].includes(code) ||
    /timeout|timed out|temporarily unavailable|connection pool|too many connections/.test(message)
  ) return "database_service_error";

  if (code.startsWith("23") || /constraint|foreign key|not-null|null value|check violation/.test(message)) {
    return "database_constraint_error";
  }

  return fallback;
}
