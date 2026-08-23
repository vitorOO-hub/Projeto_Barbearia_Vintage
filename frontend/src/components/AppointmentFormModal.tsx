import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { searchClients, fetchServices, type ClientOption, type ServiceOption } from "../api/appointments";
import { fetchBarbers, type Barber } from "../api/barbers";
import { formatCurrencyBR } from "../lib/format";

interface AppointmentFormModalProps {
  date: string;
  initialValues?: {
    client_id: string;
    client_name: string;
    service_id: string;
    barber_id: string;
    appointment_time: string;
  };
  onSubmit: (data: { client_id: string; service_id: string; barber_id: string; appointment_time: string }) => void;
  onClose: () => void;
}

export function AppointmentFormModal({ date, initialValues, onSubmit, onClose }: AppointmentFormModalProps) {
  const isEdit = Boolean(initialValues);
  const [search, setSearch] = useState(initialValues?.client_name ?? "");
  const [clientId, setClientId] = useState(initialValues?.client_id ?? "");
  const [serviceId, setServiceId] = useState(initialValues?.service_id ?? "");
  const [barberId, setBarberId] = useState(initialValues?.barber_id ?? "");
  const [time, setTime] = useState(initialValues?.appointment_time.slice(0, 5) ?? "");

  const { data: clients = [] } = useQuery<ClientOption[]>({
    queryKey: ["clients", search],
    queryFn: () => searchClients(search),
    enabled: search.length > 0,
  });

  const { data: services = [] } = useQuery<ServiceOption[]>({ queryKey: ["services"], queryFn: fetchServices });
  const { data: barbers = [] } = useQuery<Barber[]>({ queryKey: ["barbers"], queryFn: fetchBarbers });

  const selectedService = services.find((s) => s.id === serviceId);

  return (
    <div role="dialog" className="fixed inset-0 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
        <h2 className="text-lg font-semibold">{isEdit ? "Editar agendamento" : "Novo agendamento"} — {date}</h2>

        <label className="mt-4 block text-sm font-medium text-gray-700">Cliente</label>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar cliente por nome"
          className="mt-1 w-full rounded border px-3 py-2"
        />
        <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="mt-2 w-full rounded border px-3 py-2">
          <option value="">Selecione o cliente</option>
          {clientId && !clients.some((c) => c.id === clientId) && (
            <option value={clientId}>{initialValues?.client_name}</option>
          )}
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <label className="mt-4 block text-sm font-medium text-gray-700">Serviço</label>
        <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} className="mt-1 w-full rounded border px-3 py-2">
          <option value="">Selecione o serviço</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        {selectedService && (
          <p className="mt-1 text-sm text-gray-500">
            Duração: {selectedService.duration_minutes} min · {formatCurrencyBR(selectedService.price)}
          </p>
        )}

        <label htmlFor="barber" className="mt-4 block text-sm font-medium text-gray-700">
          Cabeleireiro
        </label>
        <select
          id="barber"
          value={barberId}
          onChange={(e) => setBarberId(e.target.value)}
          className="mt-1 w-full rounded border px-3 py-2"
        >
          <option value="">Selecione o cabeleireiro</option>
          {barbers.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>

        <label className="mt-4 block text-sm font-medium text-gray-700">Horário</label>
        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="mt-1 w-full rounded border px-3 py-2" />

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded px-4 py-2 text-gray-700 hover:bg-gray-100">
            Cancelar
          </button>
          <button
            onClick={() =>
              onSubmit({ client_id: clientId, service_id: serviceId, barber_id: barberId, appointment_time: `${time}:00` })
            }
            disabled={!clientId || !serviceId || !barberId || !time}
            className="rounded bg-gray-900 px-4 py-2 text-white disabled:opacity-50"
          >
            Salvar agendamento
          </button>
        </div>
      </div>
    </div>
  );
}
