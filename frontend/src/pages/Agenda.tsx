import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createAppointment,
  deleteAppointment,
  fetchAppointments,
  fetchAppointmentsRange,
  updateAppointment,
  updateAppointmentStatus,
  type AppointmentDetail,
} from "../api/appointments";
import { StatusBadge, type AppointmentStatus } from "../components/StatusBadge";
import { ConfirmModal } from "../components/ConfirmModal";
import { AppointmentFormModal } from "../components/AppointmentFormModal";
import { WeekView } from "../components/WeekView";
import { formatCurrencyBR, formatTimeBR } from "../lib/format";
import { translateApiError } from "../api/errors";
import { useToast } from "../context/ToastContext";
import { getWeekDays, getWeekStart, shiftWeek, toISODate } from "../lib/week";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

const STATUS_OPTIONS: { value: AppointmentStatus; label: string }[] = [
  { value: "agendado", label: "Agendado" },
  { value: "concluido", label: "Concluído" },
  { value: "cancelado", label: "Cancelado" },
  { value: "nao_compareceu", label: "Não compareceu" },
];

type ViewMode = "lista" | "semana";

export function Agenda() {
  const [date, setDate] = useState(todayISO());
  const [view, setView] = useState<ViewMode>("lista");
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<AppointmentDetail | null>(null);
  const [removeTarget, setRemoveTarget] = useState<AppointmentDetail | null>(null);
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["appointments", date],
    queryFn: () => fetchAppointments(date),
    enabled: view === "lista",
  });

  const weekDays = getWeekDays(weekStart);
  const weekStartISO = toISODate(weekStart);
  const weekEndISO = toISODate(weekDays[6]);

  const { data: weekAppointments = [], isLoading: isWeekLoading } = useQuery({
    queryKey: ["appointments", "semana", weekStartISO],
    queryFn: () => fetchAppointmentsRange(weekStartISO, weekEndISO),
    enabled: view === "semana",
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["appointments"] });
  }

  const createMutation = useMutation({
    mutationFn: (payload: { client_id: string; service_id: string; barber_id: string; appointment_time: string }) =>
      createAppointment({ ...payload, appointment_date: date }),
    onSuccess: () => {
      invalidate();
      toast.success("Agendamento criado e cliente notificado por e-mail.");
      setShowForm(false);
    },
    onError: (error) => toast.error(translateApiError(error)),
  });

  const editMutation = useMutation({
    mutationFn: (payload: {
      id: string;
      client_id: string;
      service_id: string;
      barber_id: string;
      appointment_time: string;
    }) =>
      updateAppointment(payload.id, {
        client_id: payload.client_id,
        service_id: payload.service_id,
        barber_id: payload.barber_id,
        appointment_time: payload.appointment_time,
      }),
    onSuccess: () => {
      invalidate();
      toast.success("Agendamento atualizado.");
      setEditTarget(null);
    },
    onError: (error) => toast.error(translateApiError(error)),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateAppointmentStatus(id, status),
    onSuccess: () => {
      invalidate();
      toast.success("Status do agendamento atualizado.");
    },
    onError: (error) => toast.error(translateApiError(error)),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => deleteAppointment(id),
    onSuccess: () => {
      invalidate();
      toast.success("Agendamento removido.");
      setRemoveTarget(null);
    },
    onError: (error) => toast.error(translateApiError(error)),
  });

  return (
    <div className="mx-auto max-w-3xl p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Agenda</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setView("lista")}
            className={`rounded px-3 py-1.5 text-sm font-medium ${
              view === "lista" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700"
            }`}
          >
            Lista
          </button>
          <button
            onClick={() => setView("semana")}
            className={`rounded px-3 py-1.5 text-sm font-medium ${
              view === "semana" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700"
            }`}
          >
            Semana
          </button>
        </div>
      </div>

      {view === "lista" && (
        <>
          <div className="mt-4 flex items-center justify-between">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded border px-3 py-2" />
          </div>

          <button onClick={() => setShowForm(true)} className="mt-4 rounded bg-gray-900 px-4 py-2 text-white">
            Novo agendamento
          </button>

          {isLoading && <p className="mt-6 text-gray-500">Carregando...</p>}

          <ul className="mt-6 divide-y">
            {appointments.map((appt) => (
              <li key={appt.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">{appt.client_name}</p>
                  <p className="text-sm text-gray-500">
                    <span>{formatTimeBR(appt.appointment_time)}</span> · <span>{appt.service_name}</span> ·{" "}
                    <span>{appt.barber_name}</span> · <span>{formatCurrencyBR(appt.service_price)}</span>
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={appt.status} />
                  <label className="sr-only" htmlFor={`status-${appt.id}`}>
                    Status do agendamento
                  </label>
                  <select
                    id={`status-${appt.id}`}
                    aria-label="Status do agendamento"
                    value={appt.status}
                    onChange={(e) => statusMutation.mutate({ id: appt.id, status: e.target.value })}
                    className="rounded border px-2 py-1 text-sm"
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => setEditTarget(appt)}
                    className="text-sm text-gray-700 hover:underline"
                    aria-label="Editar agendamento"
                  >
                    Editar agendamento
                  </button>
                  <button
                    onClick={() => setRemoveTarget(appt)}
                    className="text-sm text-red-600 hover:underline"
                    aria-label="Remover agendamento"
                  >
                    Remover agendamento
                  </button>
                </div>
              </li>
            ))}
            {!isLoading && appointments.length === 0 && (
              <p className="py-6 text-gray-500">Nenhum agendamento para este dia.</p>
            )}
          </ul>
        </>
      )}

      {view === "semana" && (
        <WeekView
          weekStart={weekStart}
          appointments={weekAppointments}
          isLoading={isWeekLoading}
          onPrevWeek={() => setWeekStart((w) => shiftWeek(w, -1))}
          onNextWeek={() => setWeekStart((w) => shiftWeek(w, 1))}
          onSelectAppointment={(appt) => setEditTarget(appt)}
        />
      )}

      {showForm && (
        <AppointmentFormModal date={date} onClose={() => setShowForm(false)} onSubmit={(data) => createMutation.mutate(data)} />
      )}

      {editTarget && (
        <AppointmentFormModal
          date={editTarget.appointment_date}
          initialValues={{
            client_id: editTarget.client_id,
            client_name: editTarget.client_name,
            service_id: editTarget.service_id,
            barber_id: editTarget.barber_id,
            appointment_time: editTarget.appointment_time,
          }}
          onClose={() => setEditTarget(null)}
          onSubmit={(data) => editMutation.mutate({ id: editTarget.id, ...data })}
        />
      )}

      <ConfirmModal
        open={removeTarget !== null}
        title="Remover agendamento"
        message={`Tem certeza que deseja remover o agendamento de ${removeTarget?.client_name}? Esta ação não pode ser desfeita.`}
        confirmLabel="Confirmar"
        onCancel={() => setRemoveTarget(null)}
        onConfirm={() => removeTarget && removeMutation.mutate(removeTarget.id)}
      />
    </div>
  );
}
