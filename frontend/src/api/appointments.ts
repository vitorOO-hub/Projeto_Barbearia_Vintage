import { apiClient } from "./client";

export interface AppointmentDetail {
  id: string;
  client_id: string;
  service_id: string;
  barber_id: string;
  appointment_date: string;
  appointment_time: string;
  status: "agendado" | "concluido" | "cancelado" | "nao_compareceu";
  client_name: string;
  client_email: string | null;
  service_name: string;
  service_price: number;
  service_duration_minutes: number;
  barber_name: string;
}

export interface ClientOption {
  id: string;
  name: string;
  email: string | null;
}

export interface ServiceOption {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
}

export async function fetchAppointments(date: string): Promise<AppointmentDetail[]> {
  const { data } = await apiClient.get<AppointmentDetail[]>("/api/v1/appointments", { params: { date } });
  return data;
}

export async function fetchAppointmentsRange(startDate: string, endDate: string): Promise<AppointmentDetail[]> {
  const { data } = await apiClient.get<AppointmentDetail[]>("/api/v1/appointments", {
    params: { start_date: startDate, end_date: endDate },
  });
  return data;
}

export async function createAppointment(payload: {
  client_id: string;
  service_id: string;
  barber_id: string;
  appointment_date: string;
  appointment_time: string;
}): Promise<AppointmentDetail> {
  const { data } = await apiClient.post<AppointmentDetail>("/api/v1/appointments", payload);
  return data;
}

export async function updateAppointmentStatus(id: string, status: string): Promise<AppointmentDetail> {
  const { data } = await apiClient.patch<AppointmentDetail>(`/api/v1/appointments/${id}/status`, { status });
  return data;
}

export async function deleteAppointment(id: string): Promise<void> {
  await apiClient.delete(`/api/v1/appointments/${id}`);
}

export async function updateAppointment(
  id: string,
  payload: Partial<{
    client_id: string;
    service_id: string;
    barber_id: string;
    appointment_date: string;
    appointment_time: string;
  }>
): Promise<AppointmentDetail> {
  const { data } = await apiClient.put<AppointmentDetail>(`/api/v1/appointments/${id}`, payload);
  return data;
}

export async function searchClients(search: string): Promise<ClientOption[]> {
  const { data } = await apiClient.get<ClientOption[]>("/api/v1/clients", { params: { search } });
  return data;
}

export async function fetchServices(): Promise<ServiceOption[]> {
  const { data } = await apiClient.get<ServiceOption[]>("/api/v1/services");
  return data;
}
