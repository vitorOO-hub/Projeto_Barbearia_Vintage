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

export interface WeekRevenue {
  week_start: string;
  week_end: string;
  total: number;
  appointments_count: number;
  by_barber: { barber_name: string; total: number }[];
}

export interface DashboardHistory {
  current_month_total: number;
  weeks: WeekRevenue[];
}

export async function fetchDashboardHistory(): Promise<DashboardHistory> {
  const { data } = await apiClient.get<DashboardHistory>("/api/v1/dashboard/history");
  return data;
}
