function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function supabasePublicEnv() {
  return {
    url: required("NEXT_PUBLIC_SUPABASE_URL"),
    anonKey: required("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  };
}

export function adminEmails(): Set<string> {
  return new Set(
    required("ADMIN_EMAILS")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAllowedAdmin(email?: string | null): boolean {
  return Boolean(email && adminEmails().has(email.toLowerCase()));
}

export function legacyWritesEnabled(): boolean {
  return process.env.ENABLE_LEGACY_WRITES?.trim().toLowerCase() === "true";
}

export function cloudflareServerEnv() {
  return {
    accountId: required("CLOUDFLARE_ACCOUNT_ID"),
    apiToken: required("CLOUDFLARE_API_TOKEN"),
    streamCustomerCode: required("CLOUDFLARE_STREAM_CUSTOMER_CODE"),
    imagesAccountHash: required("CLOUDFLARE_IMAGES_ACCOUNT_HASH"),
    imagesVariant: process.env.CLOUDFLARE_IMAGES_VARIANT?.trim() || "public",
  };
}
