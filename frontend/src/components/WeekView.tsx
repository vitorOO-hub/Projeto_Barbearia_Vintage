import { useEffect, useRef } from "react";
import type { AppointmentDetail } from "../api/appointments";
import { getWeekDays, TIME_SLOTS, slotForTime, toISODate } from "../lib/week";

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const STATUS_BLOCK_CLASSES: Record<AppointmentDetail["status"], string> = {
  agendado: "bg-blue-100 text-blue-900 border-blue-300",
  concluido: "bg-green-100 text-green-900 border-green-300",
  cancelado: "bg-gray-100 text-gray-700 border-gray-300",
  nao_compareceu: "bg-red-100 text-red-900 border-red-300",
};

interface WeekViewProps {
  weekStart: Date;
  appointments: AppointmentDetail[];
  isLoading: boolean;
  today?: Date;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onSelectAppointment: (appointment: AppointmentDetail) => void;
}

export function WeekView({
  weekStart,
  appointments,
  isLoading,
  today = new Date(),
  onPrevWeek,
  onNextWeek,
  onSelectAppointment,
}: WeekViewProps) {
  const days = getWeekDays(weekStart);
  const todayISO = toISODate(today);

  const todayColumnRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    todayColumnRef.current?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
  }, [todayISO]);

  function appointmentsFor(dayISO: string, slot: string): AppointmentDetail[] {
    return appointments.filter(
      (appt) => appt.appointment_date === dayISO && slotForTime(appt.appointment_time) === slot
    );
  }

  if (isLoading) {
    return (
      <div className="mt-6 animate-pulse space-y-2" aria-label="Carregando calendário">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="h-8 rounded bg-gray-100" />
        ))}
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <button onClick={onPrevWeek} className="rounded border px-3 py-1 text-sm hover:bg-gray-50">
          &lt; Anterior
        </button>
        <button onClick={onNextWeek} className="rounded border px-3 py-1 text-sm hover:bg-gray-50">
          Próxima &gt;
        </button>
      </div>

      {appointments.length === 0 && <p className="mt-4 text-gray-500">Nenhum agendamento neste período.</p>}

      <div className="mt-4 overflow-x-auto">
        <div className="grid min-w-[720px] grid-cols-[64px_repeat(7,1fr)]">
          <div />
          {days.map((day) => {
            const dayISO = toISODate(day);
            const isToday = dayISO === todayISO;
            const dayMonth = `${String(day.getDate()).padStart(2, "0")}/${String(day.getMonth() + 1).padStart(2, "0")}`;
            return (
              <div
                key={dayISO}
                ref={isToday ? todayColumnRef : undefined}
                className={`border-b p-2 text-center text-sm font-medium ${
                  isToday ? "bg-gray-900 text-white" : "text-gray-700"
                }`}
              >
                {WEEKDAY_LABELS[day.getDay()]} {dayMonth}
              </div>
            );
          })}

          {TIME_SLOTS.map((slot) => (
            <div key={slot} className="contents">
              <div className="border-b p-1 text-right text-xs text-gray-400">{slot}</div>
              {days.map((day) => {
                const dayISO = toISODate(day);
                const cellAppointments = appointmentsFor(dayISO, slot);
                return (
                  <div key={`${dayISO}-${slot}`} className="min-h-[28px] space-y-1 border-b border-l p-1">
                    {cellAppointments.map((appt) => (
                      <button
                        key={appt.id}
                        onClick={() => onSelectAppointment(appt)}
                        className={`block w-full rounded border px-1 py-0.5 text-left text-xs ${STATUS_BLOCK_CLASSES[appt.status]}`}
                      >
                        <span className="block font-medium">{appt.client_name}</span>
                        <span className="block">
                          {appt.service_name} · {appt.barber_name}
                        </span>
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
