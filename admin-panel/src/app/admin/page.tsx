import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getDashboardSnapshot } from "@/lib/services/dashboardService";
import { DashboardView } from "./dashboard-view";

export default async function DashboardPage() {
  const sb = await createServerSupabaseClient();
  const snapshot = await getDashboardSnapshot(sb);
  return <DashboardView {...snapshot} />;
}
