"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/protected-route";
import { DashboardShell } from "@/components/dashboard-shell";
import { useAuth } from "@/lib/auth-context";
import { api, downloadFile } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";

type Tab = "overview" | "analytics" | "reports" | "users" | "invitations" | "templates" | "products" | "payments" | "subscriptions" | "leads" | "notifications" | "activity";
type Row = Record<string, unknown>;
type PageData = { count: number; results: Row[]; next: string | null; previous: string | null };
type DashboardData = {
  kpis: Record<string, number>;
  recent_users: { id: string; email: string; full_name: string; created_at: string }[];
  recent_activity: { id: string; actor: string; action: string; summary: string; created_at: string }[];
};
type AnalyticsData = {
  period_days: number;
  start_date: string;
  end_date: string;
  series: Record<string, { period: string; value?: number; value_paise?: number }[]>;
  breakdowns: Record<string, { status?: string; response?: string; plan__code?: string; plan__name?: string; template__category?: string; active?: boolean; total: number }[]>;
  totals: Record<string, number>;
};

const TABS: { id: Tab; label: string; endpoint?: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "analytics", label: "Analytics" },
  { id: "reports", label: "Reports" },
  { id: "users", label: "Users", endpoint: "/admin/users/" },
  { id: "invitations", label: "Invitations", endpoint: "/admin/invitations/" },
  { id: "templates", label: "Invitation cards", endpoint: "/admin/templates/" },
  { id: "products", label: "Products", endpoint: "/admin/products/" },
  { id: "payments", label: "Payments", endpoint: "/admin/payments/" },
  { id: "subscriptions", label: "Subscriptions", endpoint: "/admin/subscriptions/" },
  { id: "leads", label: "Leads", endpoint: "/admin/leads/" },
  { id: "notifications", label: "Notifications", endpoint: "/admin/notifications/" },
  { id: "activity", label: "Activity log", endpoint: "/admin/activity/" },
];

const COLUMNS: Record<Exclude<Tab, "overview" | "analytics" | "reports">, string[]> = {
  users: ["email", "full_name", "role", "subscription_tier", "is_active", "is_verified", "invitation_count", "created_at"],
  invitations: ["title", "owner_email", "template_name", "event_type", "status", "guest_count", "rsvp_count", "created_at"],
  templates: ["name", "category", "premium", "price", "active", "created_at"],
  products: ["name", "slug", "status", "tagline", "active", "order"],
  payments: ["user_email", "plan_name", "amount", "currency", "status", "gateway_order_id", "created_at"],
  subscriptions: ["user_email", "plan_name", "status", "starts_at", "ends_at", "created_at"],
  leads: ["full_name", "email", "company", "source", "created_at"],
  notifications: ["user_email", "category", "title", "is_read", "email_status", "created_at"],
  activity: ["actor", "action", "target_type", "target_id", "summary", "created_at"],
};

function display(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" && value.length > 22 && !Number.isNaN(Date.parse(value))) return new Date(value).toLocaleString();
  if (typeof value === "object") return JSON.stringify(value) ?? String(value);
  return String(value);
}

function AdminContent() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [analyticsDays, setAnalyticsDays] = useState("30");
  const [reportType, setReportType] = useState("payments");
  const [reportStart, setReportStart] = useState("");
  const [reportEnd, setReportEnd] = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  const [page, setPage] = useState<PageData | null>(null);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!isLoading && user && !user.is_staff) router.replace("/dashboard");
  }, [isLoading, user, router]);

  const activeTab = useMemo(() => TABS.find((item) => item.id === tab), [tab]);

  const loadOverview = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await api.get<{ data: DashboardData }>("/admin/dashboard/");
      setDashboard(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the admin overview.");
    } finally { setLoading(false); }
  }, []);

  const loadAnalytics = useCallback(async (days: string) => {
    setLoading(true); setError("");
    try {
      const response = await api.get<{ data: AnalyticsData }>(`/admin/analytics/?days=${days}`);
      setAnalytics(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load analytics.");
    } finally { setLoading(false); }
  }, []);

  const loadTable = useCallback(async (selected: Tab, searchTerm = "") => {
    const item = TABS.find((entry) => entry.id === selected);
    if (!item?.endpoint) return;
    setLoading(true); setError("");
    try {
      const suffix = searchTerm && ["users", "invitations", "payments", "templates", "products"].includes(selected) ? `?search=${encodeURIComponent(searchTerm)}` : "";
      const response = await api.get<PageData>(`${item.endpoint}${suffix}`);
      setPage(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not load ${item.label.toLowerCase()}.`);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (!user?.is_staff) return;
    if (tab === "overview") loadOverview();
    else if (tab === "analytics") loadAnalytics(analyticsDays);
    else if (tab !== "reports") loadTable(tab, query);
  }, [tab, query, analyticsDays, user?.is_staff, loadOverview, loadAnalytics, loadTable]);

  const selectTab = (next: Tab) => { setTab(next); setPage(null); setSearch(""); setQuery(""); setNotice(""); };
  const refresh = () => tab === "overview" ? loadOverview() : tab === "analytics" ? loadAnalytics(analyticsDays) : tab === "reports" ? undefined : loadTable(tab, query);

  const exportReport = async () => {
    setReportLoading(true); setError(""); setNotice("");
    try {
      const params = new URLSearchParams({ report: reportType });
      if (reportStart) params.set("start_date", reportStart);
      if (reportEnd) params.set("end_date", reportEnd);
      await downloadFile(`/admin/reports/export/?${params.toString()}`, `nexainvite-${reportType}-report.csv`);
      setNotice("Report downloaded successfully.");
    } catch (err) { setError(err instanceof Error ? err.message : "Could not export report."); }
    finally { setReportLoading(false); }
  };

  const mutate = async (row: Row, action: "user-active" | "template-active" | "product-active" | "invitation-status") => {
    const id = String(row.id ?? "");
    if (!id) return;
    try {
      if (action === "user-active") await api.patch(`/admin/users/${id}/`, { is_active: !(row.is_active === true) });
      if (action === "template-active") await api.patch(`/admin/templates/${id}/`, { active: !(row.active === true) });
      if (action === "product-active") await api.patch(`/admin/products/${id}/`, { active: !(row.active === true) });
      if (action === "invitation-status") {
        const next = row.status === "ARCHIVED" ? "DRAFT" : "ARCHIVED";
        await api.patch(`/admin/invitations/${id}/`, { status: next });
      }
      setNotice("Changes saved successfully.");
      refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not save changes."); }
  };

  const editCatalogueRecord = async (row: Row) => {
    const id = String(row.id ?? "");
    try {
      if (tab === "templates") {
        const name = window.prompt("Invitation card name", String(row.name ?? ""));
        if (name === null) return;
        const category = window.prompt("Category: WEDDING, BIRTHDAY, ANNIVERSARY, CORPORATE, RELIGIOUS, BABY_SHOWER", String(row.category ?? "WEDDING"));
        if (category === null) return;
        const premium = window.confirm("Should this be a premium invitation card?");
        const price = window.prompt("Price (INR)", String(row.price ?? "0"));
        if (price === null) return;
        await api.patch(`/admin/templates/${id}/`, { name, category: category.toUpperCase(), premium, price });
      } else if (tab === "products") {
        const name = window.prompt("Product name", String(row.name ?? ""));
        if (name === null) return;
        const tagline = window.prompt("Product tagline", String(row.tagline ?? ""));
        if (tagline === null) return;
        const description = window.prompt("Product description", String(row.description ?? ""));
        if (description === null) return;
        const statusValue = window.prompt("Status: OPERATIONAL, BETA, COMING_SOON", String(row.status ?? "COMING_SOON"));
        if (statusValue === null) return;
        await api.patch(`/admin/products/${id}/`, { name, tagline, description, status: statusValue.toUpperCase() });
      }
      setNotice("Catalogue details updated. Existing invitation and product records were retained.");
      refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not update catalogue details."); }
  };

  const createCatalogueRecord = async () => {
    try {
      if (tab === "templates") {
        const name = window.prompt("New invitation card name");
        if (!name) return;
        const category = window.prompt("Category: WEDDING, BIRTHDAY, ANNIVERSARY, CORPORATE, RELIGIOUS, BABY_SHOWER", "WEDDING");
        if (!category) return;
        await api.post("/admin/templates/", { name, category: category.toUpperCase(), template_json: {}, active: true, premium: false, price: "0.00" });
      } else if (tab === "products") {
        const name = window.prompt("New product name");
        if (!name) return;
        const slug = window.prompt("URL slug (lowercase, hyphenated)", name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
        if (!slug) return;
        const tagline = window.prompt("Product tagline", "A NexaForge product");
        if (tagline === null) return;
        const description = window.prompt("Product description", "Product description");
        if (description === null) return;
        await api.post("/admin/products/", { name, slug, tagline, description, status: "COMING_SOON", icon_key: "box", active: true, order: 100, features: [], target_audience: [], highlights: [] });
      }
      setNotice("Catalogue item created.");
      refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not create catalogue item."); }
  };

  const renderActions = (row: Row) => {
    if (tab === "users") return <Button size="sm" variant="outline" onClick={() => mutate(row, "user-active")}>{row.is_active === true ? "Deactivate" : "Reactivate"}</Button>;
    if (tab === "templates") return <div className="flex gap-1"><Button size="sm" variant="outline" onClick={() => editCatalogueRecord(row)}>Edit</Button><Button size="sm" variant="outline" onClick={() => mutate(row, "template-active")}>{row.active === true ? "Disable" : "Enable"}</Button></div>;
    if (tab === "products") return <div className="flex gap-1"><Button size="sm" variant="outline" onClick={() => editCatalogueRecord(row)}>Edit</Button><Button size="sm" variant="outline" onClick={() => mutate(row, "product-active")}>{row.active === true ? "Disable" : "Enable"}</Button></div>;
    if (tab === "invitations") return <Button size="sm" variant="outline" onClick={() => mutate(row, "invitation-status")}>{row.status === "ARCHIVED" ? "Restore draft" : "Archive"}</Button>;
    return null;
  };

  if (isLoading || !user?.is_staff) return <div className="py-16 text-center text-sm text-muted">Checking administrator access…</div>;

  const kpis: Record<string, number> = dashboard?.kpis ?? {};
  const kpiLabels: [string, string, boolean][] = [
    ["total_users", "Total users", false], ["active_users", "Active users", false],
    ["total_invitations", "Invitations", false], ["published_invitations", "Published", false],
    ["total_guests", "Guests", false], ["total_rsvps", "RSVPs", false],
    ["total_templates", "Invitation cards", false], ["active_templates", "Active cards", false],
    ["total_products", "Products", false], ["active_products", "Active products", false],
    ["active_subscriptions", "Active subscriptions", false], ["monthly_revenue_paise", "Revenue this month", true],
    ["total_revenue_paise", "Lifetime revenue", true], ["total_leads", "Leads", false],
    ["unread_notifications", "Unread notifications", false], ["failed_notification_emails", "Failed emails", false],
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Administration" description="Manage NexaInvite customers, invitations, catalogues, billing and platform activity." />
      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        {TABS.map((item) => <button key={item.id} onClick={() => selectTab(item.id)} className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${tab === item.id ? "bg-secondary text-white" : "bg-surface-2 text-foreground/75 hover:text-foreground"}`}>{item.label}</button>)}
      </div>
      {error && <div role="alert" className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-800">{notice}</div>}
      {tab === "analytics" ? (
        <section className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-heading text-lg font-semibold">Business analytics</h2><p className="text-xs text-muted">Actual platform records · {analytics?.start_date ?? "—"} to {analytics?.end_date ?? "—"}</p></div><select value={analyticsDays} onChange={(event) => setAnalyticsDays(event.target.value)} className="h-9 rounded-lg border border-border bg-background px-3 text-sm"><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="365">Last 12 months</option></select></div>
          {loading && !analytics ? <p className="text-sm text-muted">Loading analytics…</p> : analytics && <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{[["New users", analytics.totals.new_users], ["New invitations", analytics.totals.new_invitations], ["New RSVPs", analytics.totals.new_rsvps], ["Captured revenue", `₹${(analytics.totals.captured_revenue_paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`], ["Active subscriptions", analytics.totals.active_subscriptions]].map(([label, value]) => <div key={String(label)} className="rounded-xl border border-border bg-background p-4"><p className="text-xs text-muted">{label}</p><p className="mt-2 text-2xl font-semibold">{typeof value === "number" ? value.toLocaleString("en-IN") : value}</p></div>)}</div>
            <div className="grid gap-4 xl:grid-cols-2">
              {([["Registrations", "registrations", "value"], ["Invitations created", "invitations", "value"], ["RSVP responses", "rsvps", "value"], ["Captured revenue (₹)", "revenue", "value_paise"]] as const).map(([title, key, valueKey]) => {
                const points = analytics.series[key] ?? []; const max = Math.max(1, ...points.map((point) => Number(point[valueKey] ?? 0)));
                return <div key={key} className="rounded-xl border border-border bg-background p-4"><h3 className="mb-4 font-semibold">{title}</h3>{points.length ? <div className="flex h-40 items-end gap-1 border-b border-border pb-1">{points.map((point) => { const value = Number(point[valueKey] ?? 0); const height = Math.max(3, (value / max) * 100); return <div key={point.period} title={`${point.period}: ${key === "revenue" ? `₹${(value / 100).toLocaleString("en-IN")}` : value}`} className="min-w-0 flex-1 rounded-t bg-secondary/80" style={{ height: `${height}%` }} />; })}</div> : <p className="py-10 text-center text-sm text-muted">No activity in this period.</p>}<div className="mt-2 flex justify-between text-[10px] text-muted"><span>{points[0]?.period ?? ""}</span><span>{points[points.length - 1]?.period ?? ""}</span></div></div>;
              })}
            </div>
            <div className="grid gap-4 lg:grid-cols-2">{([["Invitation status", "invitation_status", "status"], ["RSVP responses", "rsvp_responses", "response"], ["Active subscription plans", "active_subscription_plans", "plan__name"], ["Invitation categories", "template_categories", "template__category"], ["Product portfolio status", "product_portfolio", "status"]] as const).map(([title, key, labelKey]) => <div key={key} className="rounded-xl border border-border bg-background p-4"><h3 className="mb-3 font-semibold">{title}</h3>{(analytics.breakdowns[key] ?? []).length ? analytics.breakdowns[key].map((row, index) => <div key={`${key}-${index}`} className="flex justify-between border-t border-border py-2 text-sm"><span>{String(row[labelKey] ?? "Other")}{key === "product_portfolio" ? ` · ${row.active ? "Active" : "Inactive"}` : ""}</span><strong>{row.total}</strong></div>) : <p className="text-sm text-muted">No records available.</p>}</div>)}</div>
            <div className="rounded-xl border border-border bg-background p-4"><h3 className="font-semibold">Subscription conversion</h3><p className="mt-2 text-3xl font-semibold">{analytics.totals.customer_conversion_rate_percent.toFixed(2)}%</p><p className="text-xs text-muted">{analytics.totals.paying_customers.toLocaleString("en-IN")} paying customers out of {analytics.totals.registered_users.toLocaleString("en-IN")} registered users. This is a lifetime account conversion measure.</p></div>
          </>}
        </section>
      ) : tab === "reports" ? (
        <section className="max-w-3xl space-y-4 rounded-xl border border-border bg-background p-5"><div><h2 className="font-heading text-lg font-semibold">Export business reports</h2><p className="mt-1 text-sm text-muted">Download CSV reports for analysis in Excel or Google Sheets. Date range is optional and limited to 366 days.</p></div><label className="block text-sm">Report type<select value={reportType} onChange={(event) => setReportType(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3"><option value="users">Users</option><option value="invitations">Invitations</option><option value="guests">Guests</option><option value="rsvps">RSVPs</option><option value="payments">Payments</option><option value="subscriptions">Subscriptions</option><option value="leads">Leads</option></select></label><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Start date<input type="date" value={reportStart} onChange={(event) => setReportStart(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3" /></label><label className="text-sm">End date<input type="date" value={reportEnd} onChange={(event) => setReportEnd(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3" /></label></div><Button onClick={exportReport} disabled={reportLoading || Boolean(reportStart && reportEnd && reportStart > reportEnd)}>{reportLoading ? "Preparing report…" : "Download CSV"}</Button><p className="text-xs text-muted">Payment amounts are exported in minor currency units (paise). Existing records are read-only and are not modified by report exports.</p></section>
      ) : tab === "overview" ? (
        <>
          <div className="flex items-center justify-between"><h2 className="font-heading text-lg font-semibold">Platform overview</h2><Button variant="outline" size="sm" onClick={refresh}>Refresh</Button></div>
          {loading && !dashboard ? <p className="text-sm text-muted">Loading metrics…</p> : <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{kpiLabels.map(([key, label, money]) => <div key={key} className="rounded-xl border border-border bg-background p-4"><p className="text-xs font-medium text-muted">{label}</p><p className="mt-2 font-heading text-2xl font-semibold">{money ? `₹${((kpis[key] ?? 0) / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}` : (kpis[key] ?? 0).toLocaleString("en-IN")}</p></div>)}</div>}
          <div className="grid gap-5 lg:grid-cols-2">
            <section className="rounded-xl border border-border bg-background p-4"><h3 className="mb-3 font-semibold">Recently registered users</h3>{dashboard?.recent_users.length ? dashboard.recent_users.map((item) => <div key={item.id} className="flex justify-between gap-3 border-t border-border py-2 text-sm"><span>{item.full_name || item.email}</span><span className="text-muted">{new Date(item.created_at).toLocaleDateString()}</span></div>) : <p className="text-sm text-muted">No users to display.</p>}</section>
            <section className="rounded-xl border border-border bg-background p-4"><h3 className="mb-3 font-semibold">Recent admin activity</h3>{dashboard?.recent_activity.length ? dashboard.recent_activity.map((item) => <div key={item.id} className="border-t border-border py-2"><p className="text-sm">{item.summary}</p><p className="text-xs text-muted">{item.actor} · {new Date(item.created_at).toLocaleString()}</p></div>) : <p className="text-sm text-muted">Administrative actions will appear here.</p>}</section>
          </div>
        </>
      ) : (
        <section className="overflow-hidden rounded-xl border border-border bg-background">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4"><div><h2 className="font-heading text-lg font-semibold">{activeTab?.label}</h2><p className="text-xs text-muted">{page?.count ?? 0} records · existing records are preserved</p></div><div className="flex flex-wrap gap-2">{["users", "invitations", "payments", "templates", "products"].includes(tab) && <form onSubmit={(event) => { event.preventDefault(); setQuery(search); }} className="flex gap-2"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search records…" className="h-9 w-48 rounded-lg border border-border bg-background px-3 text-sm" /><Button size="sm" type="submit" variant="outline">Search</Button></form>}{["templates", "products"].includes(tab) && <Button size="sm" onClick={createCatalogueRecord}>Add new</Button>}<Button size="sm" variant="outline" onClick={refresh}>Refresh</Button></div></div>
          {loading ? <p className="p-6 text-sm text-muted">Loading records…</p> : page?.results.length ? <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-surface-2 text-xs uppercase tracking-wide text-muted"><tr>{(COLUMNS[tab as Exclude<Tab, "overview" | "analytics" | "reports">] ?? []).map((column) => <th key={column} className="px-4 py-3">{column.replaceAll("_", " ")}</th>)}<th className="px-4 py-3">Actions</th></tr></thead><tbody>{page.results.map((row) => <tr key={String(row.id)} className="border-t border-border align-top">{(COLUMNS[tab as Exclude<Tab, "overview" | "analytics" | "reports">] ?? []).map((column) => <td key={column} className="max-w-[260px] px-4 py-3"><span className="block truncate" title={display(row[column])}>{display(row[column])}</span></td>)}<td className="px-4 py-3">{renderActions(row) ?? <span className="text-xs text-muted">Read only</span>}</td></tr>)}</tbody></table></div> : <p className="p-6 text-sm text-muted">No records found.</p>}
          {page && <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted"><span>Showing up to 25 records per page</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={!page.previous || loading} onClick={async () => { if (page.previous) { setLoading(true); try { setPage(await api.get<PageData>(page.previous.replace(/^.*\/api\/v1/, ""))); } finally { setLoading(false); } } }}>Previous</Button><Button size="sm" variant="outline" disabled={!page.next || loading} onClick={async () => { if (page.next) { setLoading(true); try { setPage(await api.get<PageData>(page.next.replace(/^.*\/api\/v1/, ""))); } finally { setLoading(false); } } }}>Next</Button></div></div>}
        </section>
      )}
      <p className="text-xs text-muted">Administrative access is enforced by the backend. Payments and subscriptions are currently read-only in this portal; verified payment workflows remain the source of subscription entitlements.</p>
    </div>
  );
}

export default function AdminPage() {
  return <ProtectedRoute><DashboardShell><AdminContent /></DashboardShell></ProtectedRoute>;
}
