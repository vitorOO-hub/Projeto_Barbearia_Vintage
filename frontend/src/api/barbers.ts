import { apiClient } from "./client";

export interface Barber {
  id: string;
  name: string;
}

export async function fetchBarbers(): Promise<Barber[]> {
  const { data } = await apiClient.get<Barber[]>("/api/v1/barbers");
  return data;
}

export async function createBarber(payload: { name: string }): Promise<Barber> {
  const { data } = await apiClient.post<Barber>("/api/v1/barbers", payload);
  return data;
}

export async function updateBarber(id: string, payload: { name: string }): Promise<Barber> {
  const { data } = await apiClient.put<Barber>(`/api/v1/barbers/${id}`, payload);
  return data;
}

export async function deleteBarber(id: string): Promise<void> {
  await apiClient.delete(`/api/v1/barbers/${id}`);
}
