import { apiClient } from "./client";

export interface Barber {
  id: string;
  name: string;
}

export async function fetchBarbers(): Promise<Barber[]> {
  const { data } = await apiClient.get<Barber[]>("/api/v1/barbers");
  return data;
}
