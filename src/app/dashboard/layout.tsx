import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { logout } from "@/app/actions/auth";
import { ArchiveConfirmationGuard } from "@/components/archive-confirmation-guard";
import { DashboardFormUX } from "@/components/dashboard-form-ux";
import { isAllowedAdmin } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import "./dashboard.css";
import "./forms.css";
import "./hierarchy.css";
import "./trailers.css";
import "./media-preview.css";
import "./image-fixes.css";
import "./legacy.css";
import "./confirmations.css";
import "./form-ux.css";

const nav = [
  ["Overview", "/dashboard"],
  ["Legacy App (Live)", "/dashboard/legacy"],
  ["Categories", "/dashboard/categories"],
  ["Media", "/dashboard/media"],
  ["Live TV", "/dashboard/live-tv"],
  ["Movies", "/dashboard/movies"],
  ["Shows", "/dashboard/shows"],
  ["Seasons & Episodes", "/dashboard/episodes"],
  ["Trailers", "/dashboard/trailers"],
  ["Featured", "/dashboard/featured"],
  ["Publishing", "/dashboard/publishing"],
  ["Catalog Rollout", "/dashboard/catalog-rollout"],
] as const;

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAllowedAdmin(user.email)) redirect("/login?error=unauthorized");

  return (
    <ArchiveConfirmationGuard>
    <DashboardFormUX>
    <div className="admin-shell">
      <aside className="sidebar">
        <Link className="sidebar-brand" href="/dashboard"><Image className="brand-logo sidebar-logo" src="/brand/logo-icon" width={46} height={46} priority alt="B3G logo" /><span>B3GTV <b>ADMIN</b></span></Link>
        <nav>{nav.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}</nav>
        <div className="sidebar-footer"><span className="status-dot" /> Production connected</div>
      </aside>
      <div className="main-column">
        <header className="topbar">
          <div><p className="eyebrow">CONTENT OPERATIONS</p><strong>B3GTV Library</strong></div>
          <div className="account"><span>{user.email}</span><form action={logout}><button className="button ghost" type="submit">Log out</button></form></div>
        </header>
        <main className="dashboard-content">{children}</main>
      </div>
    </div>
    </DashboardFormUX>
    </ArchiveConfirmationGuard>
  );
}
