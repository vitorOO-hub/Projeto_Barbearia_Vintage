import { apiClient } from "./client";

export interface DashboardSummary {
  appointments_today: number;
  appointments_this_week: number;
  top_services: { service_name: string; count: number }[];
}

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const { data } = await apiClient.get<DashboardSummary>("/api/v1/dashboard/summary");
  return data;
}
