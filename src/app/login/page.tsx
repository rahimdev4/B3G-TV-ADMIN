import Image from "next/image";
import { login } from "@/app/actions/auth";

const messages: Record<string, string> = {
  missing_fields: "Email and password are required.",
  unauthorized: "You do not have permission to access this admin panel.",
  auth_failed: "Supabase rejected the sign-in request.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; code?: string }>;
}) {
  const { error, code } = await searchParams;

  return (
    <main className="login-shell">
      <section className="login-brand">
        <Image className="brand-logo hero-logo" src="/brand/logo-icon" width={116} height={116} priority alt="B3G Broadcasting Everything Globally" />
        <h1>Manage the culture.</h1>
        <p className="muted">Secure content operations for the B3GTV streaming library.</p>
      </section>
      <section className="login-card">
        <div>
          <p className="eyebrow accent">ADMIN CMS</p>
          <h2>Welcome back</h2>
          <p className="muted">Sign in with your authorized administrator account.</p>
        </div>
        {error && <div className="alert error" role="alert">{messages[error] ?? "Unable to sign in."}{code ? ` Error code: ${code}` : ""}</div>}
        <form action={login} className="form-stack">
          <label>Email<input name="email" type="email" autoComplete="email" placeholder="admin@example.com" required /></label>
          <label>Password<input name="password" type="password" autoComplete="current-password" placeholder="Enter your password" required /></label>
          <button className="button primary" type="submit">Sign in securely</button>
        </form>
        <p className="security-note">Protected by Supabase authentication and an email allowlist.</p>
      </section>
    </main>
  );
}
