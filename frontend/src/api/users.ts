import { apiClient } from "./client";

export interface User {
  id: string;
  name: string;
  email: string;
  is_admin: boolean;
}

export async function fetchUsers(): Promise<User[]> {
  const { data } = await apiClient.get<User[]>("/api/v1/users");
  return data;
}

export async function createUser(payload: { name: string; email: string; password: string; is_admin: boolean }): Promise<User> {
  const { data } = await apiClient.post<User>("/api/v1/users", payload);
  return data;
}

export async function updateUser(id: string, payload: Partial<{ name: string; email: string; is_admin: boolean }>): Promise<User> {
  const { data } = await apiClient.put<User>(`/api/v1/users/${id}`, payload);
  return data;
}

export async function deleteUser(id: string): Promise<void> {
  await apiClient.delete(`/api/v1/users/${id}`);
}
