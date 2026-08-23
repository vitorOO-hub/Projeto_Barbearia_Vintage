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

export interface DashboardRevenue {
  total_this_week: number;
  by_barber: { barber_name: string; total: number }[];
}

export async function fetchDashboardRevenue(): Promise<DashboardRevenue> {
  const { data } = await apiClient.get<DashboardRevenue>("/api/v1/dashboard/revenue");
  return data;
}
