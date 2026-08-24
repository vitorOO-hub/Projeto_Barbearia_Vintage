import { apiClient } from "./client";

export interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
  active: boolean;
}

export async function fetchServices(): Promise<Service[]> {
  const { data } = await apiClient.get<Service[]>("/api/v1/services", {
    params: { include_inactive: true },
  });
  return data;
}

export async function createService(payload: { name: string; duration_minutes: number; price: number }): Promise<Service> {
  const { data } = await apiClient.post<Service>("/api/v1/services", payload);
  return data;
}

export async function toggleServiceActive(id: string, active: boolean): Promise<Service> {
  const { data } = await apiClient.put<Service>(`/api/v1/services/${id}`, { active });
  return data;
}

export async function updateService(
  id: string,
  payload: Partial<{ name: string; duration_minutes: number; price: number }>
): Promise<Service> {
  const { data } = await apiClient.put<Service>(`/api/v1/services/${id}`, payload);
  return data;
}

export async function deleteService(id: string): Promise<void> {
  await apiClient.delete(`/api/v1/services/${id}`);
}
