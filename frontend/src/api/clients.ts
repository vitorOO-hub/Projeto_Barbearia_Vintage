import { apiClient } from "./client";

export interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  active: boolean;
}

export async function fetchClients(search: string): Promise<Client[]> {
  const { data } = await apiClient.get<Client[]>("/api/v1/clients", {
    params: { search, include_inactive: true },
  });
  return data;
}

export async function createClient(payload: { name: string; email: string; phone?: string; notes?: string }): Promise<Client> {
  const { data } = await apiClient.post<Client>("/api/v1/clients", payload);
  return data;
}

export async function updateClient(id: string, payload: Partial<{ name: string; email: string; phone: string; notes: string }>): Promise<Client> {
  const { data } = await apiClient.put<Client>(`/api/v1/clients/${id}`, payload);
  return data;
}

export async function deactivateClient(id: string): Promise<void> {
  await apiClient.delete(`/api/v1/clients/${id}`);
}

export async function activateClient(id: string): Promise<Client> {
  const { data } = await apiClient.put<Client>(`/api/v1/clients/${id}`, { active: true });
  return data;
}
