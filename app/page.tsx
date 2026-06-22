import { buildSnapshot } from "@/lib/snapshot";
import { DashboardClient } from "@/components/DashboardClient";

// Server component: fetch the snapshot at build/request time, pass to client.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home() {
  const snapshot = await buildSnapshot();
  return <DashboardClient snapshot={snapshot} />;
}
