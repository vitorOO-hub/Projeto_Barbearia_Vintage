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
  const [isClientFieldFocused, setIsClientFieldFocused] = useState(false);

  const { data: clients = [] } = useQuery<ClientOption[]>({
    queryKey: ["clients", search],
    queryFn: () => searchClients(search),
    enabled: search.length > 0 && !clientId,
  });

  function selectClient(client: ClientOption) {
    setClientId(client.id);
    setSearch(client.name);
  }

  const showSuggestions = isClientFieldFocused && !clientId && search.length > 0 && clients.length > 0;

  const { data: services = [] } = useQuery<ServiceOption[]>({ queryKey: ["services"], queryFn: fetchServices });
  const { data: barbers = [] } = useQuery<Barber[]>({ queryKey: ["barbers"], queryFn: fetchBarbers });

  const selectedService = services.find((s) => s.id === serviceId);

  return (
    <div role="dialog" className="modal-backdrop">
      <div className="modal-panel">
        <h2 className="modal-title">
          {isEdit ? "Editar agendamento" : "Novo agendamento"} — {date}
        </h2>

        <label htmlFor="client" className="field-label mt-4">
          Cliente
        </label>
        <div className="relative">
          <input
            id="client"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setClientId("");
            }}
            onFocus={() => setIsClientFieldFocused(true)}
            onBlur={() => setIsClientFieldFocused(false)}
            placeholder="Buscar cliente por nome"
            autoComplete="off"
            className="field-input"
          />
          {showSuggestions && (
            <ul className="absolute z-10 mt-1 w-full rounded-md border border-line bg-paper shadow-panel" role="listbox">
              {clients.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={false}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selectClient(c);
                    }}
                    className="block w-full px-3 py-2 text-left text-ink hover:bg-cream"
                  >
                    {c.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <label className="field-label mt-4">Serviço</label>
        <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} className="field-input">
          <option value="">Selecione o serviço</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        {selectedService && (
          <p className="field-hint">
            Duração: {selectedService.duration_minutes} min · {formatCurrencyBR(selectedService.price)}
          </p>
        )}

        <label htmlFor="barber" className="field-label mt-4">
          Cabeleireiro
        </label>
        <select id="barber" value={barberId} onChange={(e) => setBarberId(e.target.value)} className="field-input">
          <option value="">Selecione o cabeleireiro</option>
          {barbers.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>

        <label className="field-label mt-4">Horário</label>
        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="field-input" />

        <div className="modal-actions">
          <button onClick={onClose} className="btn-ghost">
            Cancelar
          </button>
          <button
            onClick={() =>
              onSubmit({ client_id: clientId, service_id: serviceId, barber_id: barberId, appointment_time: `${time}:00` })
            }
            disabled={!clientId || !serviceId || !barberId || !time}
            className="btn-primary"
          >
            Salvar agendamento
          </button>
        </div>
      </div>
    </div>
  );
}
