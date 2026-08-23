import { useEffect, useRef } from "react";
import type { AppointmentDetail } from "../api/appointments";
import { getWeekDays, TIME_SLOTS, slotForTime, toISODate } from "../lib/week";

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const STATUS_BLOCK_CLASSES: Record<AppointmentDetail["status"], string> = {
  agendado: "bg-slate-soft text-slate-dark border-slate/40",
  concluido: "bg-forest-soft text-forest-dark border-forest/40",
  cancelado: "bg-line/60 text-ink-soft border-line",
  nao_compareceu: "bg-brick-soft text-brick-dark border-brick/40",
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
          <div key={i} className="h-8 rounded-md bg-line/50" />
        ))}
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <button onClick={onPrevWeek} className="btn-secondary">
          &lt; Anterior
        </button>
        <button onClick={onNextWeek} className="btn-secondary">
          Próxima &gt;
        </button>
      </div>

      {appointments.length === 0 && <p className="mt-4 text-ink-soft">Nenhum agendamento neste período.</p>}

      <div className="mt-4 overflow-x-auto rounded-lg border border-line bg-paper p-2 shadow-card">
        <div className="grid min-w-[720px] grid-cols-[64px_repeat(7,1fr)]">
          <div />
          {days.map((day) => {
            const dayISO = toISODate(day);
            const isToday = dayISO === todayISO;
            return (
              <div
                key={dayISO}
                ref={isToday ? todayColumnRef : undefined}
                className={`rounded-t-md border-b p-2 text-center text-sm font-medium ${
                  isToday ? "bg-ink text-cream" : "border-line text-ink-soft"
                }`}
              >
                {WEEKDAY_LABELS[day.getDay()]} {String(day.getDate()).padStart(2, "0")}
              </div>
            );
          })}

          {TIME_SLOTS.map((slot) => (
            <div key={slot} className="contents">
              <div className="border-b border-line p-1 text-right text-xs text-ink-faint">{slot}</div>
              {days.map((day) => {
                const dayISO = toISODate(day);
                const cellAppointments = appointmentsFor(dayISO, slot);
                return (
                  <div key={`${dayISO}-${slot}`} className="min-h-[28px] space-y-1 border-b border-l border-line p-1">
                    {cellAppointments.map((appt) => (
                      <button
                        key={appt.id}
                        onClick={() => onSelectAppointment(appt)}
                        className={`block w-full rounded-md border px-1.5 py-1 text-left text-xs transition-shadow hover:shadow-card ${STATUS_BLOCK_CLASSES[appt.status]}`}
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
