import type { AgentDataSource } from "@/lib/data/AgentDataSource";
import { MockDataSource } from "@/lib/data/MockDataSource";

// Factory by env. v1 ships "mock". A KvDataSource would register here and be
// selected via DATA_SOURCE=kv with zero component changes (AC9).
let instance: AgentDataSource | null = null;

export function getDataSource(): AgentDataSource {
  if (instance) return instance;
  const kind = process.env.DATA_SOURCE ?? "mock";
  switch (kind) {
    case "mock":
    default:
      instance = new MockDataSource();
  }
  return instance;
}
