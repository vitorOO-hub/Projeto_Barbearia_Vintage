import { useEffect, useRef, useState } from "react";
import type { AppointmentDetail } from "../api/appointments";
import { getWeekDays, TIME_SLOTS, toISODate } from "../lib/week";
import {
  GRID_END_MINUTES,
  GRID_START_MINUTES,
  PX_PER_MINUTE,
  blockHeight,
  blockTop,
  clusterOverlaps,
  formatTimeRange,
} from "../lib/gridGeometry";

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const STATUS_BLOCK_CLASSES: Record<AppointmentDetail["status"], string> = {
  agendado: "bg-blue-100 text-blue-900 border-blue-300",
  concluido: "bg-green-100 text-green-900 border-green-300",
  cancelado: "bg-gray-100 text-gray-700 border-gray-300",
  nao_compareceu: "bg-red-100 text-red-900 border-red-300",
};

const GRID_HEIGHT_PX = (GRID_END_MINUTES - GRID_START_MINUTES) * PX_PER_MINUTE;

interface WeekViewProps {
  weekStart: Date;
  appointments: AppointmentDetail[];
  isLoading: boolean;
  today?: Date;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onSelectAppointment: (appointment: AppointmentDetail) => void;
}

function blockTooltip(appt: AppointmentDetail): string {
  return `${appt.client_name}\n${formatTimeRange(appt.appointment_time, appt.service_duration_minutes)}\n${appt.service_name}\n${appt.barber_name}`;
}

function BlockContent({ appt, heightPx }: { appt: AppointmentDetail; heightPx: number }) {
  if (heightPx < 20) return null;
  if (heightPx < 40) {
    return <span className="block truncate font-medium">{appt.client_name}</span>;
  }
  if (heightPx < 60) {
    return (
      <>
        <span className="block truncate font-medium">{appt.client_name}</span>
        <span className="block truncate">{formatTimeRange(appt.appointment_time, appt.service_duration_minutes)}</span>
      </>
    );
  }
  if (heightPx < 80) {
    return (
      <>
        <span className="block truncate font-medium">{appt.client_name}</span>
        <span className="block truncate">{formatTimeRange(appt.appointment_time, appt.service_duration_minutes)}</span>
        <span className="block truncate">{appt.service_name}</span>
      </>
    );
  }
  return (
    <>
      <span className="block truncate font-medium">{appt.client_name}</span>
      <span className="block truncate">{formatTimeRange(appt.appointment_time, appt.service_duration_minutes)}</span>
      <span className="block truncate">{appt.service_name}</span>
      <span className="block truncate">{appt.barber_name}</span>
    </>
  );
}

function DayColumn({
  dayISO,
  appointments,
  onSelectAppointment,
  nowMinutes,
}: {
  dayISO: string;
  appointments: AppointmentDetail[];
  onSelectAppointment: (appointment: AppointmentDetail) => void;
  nowMinutes: number | null;
}) {
  const dayAppointments = appointments.filter((appt) => appt.appointment_date === dayISO);
  const clusters = clusterOverlaps(dayAppointments);

  return (
    <div className="relative border-l" style={{ height: `${GRID_HEIGHT_PX}px` }}>
      {TIME_SLOTS.map((slot) => (
        <div
          key={slot}
          className="absolute left-0 right-0 border-b border-gray-100"
          style={{ top: `${blockTop(`${slot}:00`)}px` }}
        />
      ))}

      {clusters.map((cluster) =>
        cluster.map((appt, index) => {
          const heightPx = blockHeight(appt.service_duration_minutes);
          const widthPercent = 100 / cluster.length;
          return (
            <button
              key={appt.id}
              type="button"
              data-testid={`appointment-block-${appt.id}`}
              title={blockTooltip(appt)}
              onClick={() => onSelectAppointment(appt)}
              className={`absolute overflow-hidden rounded border px-1 py-0.5 text-left text-xs ${STATUS_BLOCK_CLASSES[appt.status]}`}
              style={{
                top: `${blockTop(appt.appointment_time)}px`,
                height: `${heightPx}px`,
                left: `${index * widthPercent}%`,
                width: `${widthPercent}%`,
              }}
            >
              <BlockContent appt={appt} heightPx={heightPx} />
            </button>
          );
        })
      )}

      {nowMinutes !== null && (
        <div
          data-testid="now-line"
          className="pointer-events-none absolute left-0 right-0 border-t-2 border-red-500"
          style={{ top: `${(nowMinutes - GRID_START_MINUTES) * PX_PER_MINUTE}px` }}
        />
      )}
    </div>
  );
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

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);
  const nowMinutesRaw = now.getHours() * 60 + now.getMinutes();
  const nowMinutes =
    nowMinutesRaw >= GRID_START_MINUTES && nowMinutesRaw <= GRID_END_MINUTES ? nowMinutesRaw : null;

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

          <div className="relative">
            {TIME_SLOTS.map((slot) => (
              <div
                key={slot}
                className="absolute left-0 right-0 text-right text-xs text-gray-400"
                style={{ top: `${blockTop(`${slot}:00`)}px` }}
              >
                {slot}
              </div>
            ))}
            <div style={{ height: `${GRID_HEIGHT_PX}px` }} />
          </div>
          {days.map((day) => {
            const dayISO = toISODate(day);
            return (
              <DayColumn
                key={dayISO}
                dayISO={dayISO}
                appointments={appointments}
                onSelectAppointment={onSelectAppointment}
                nowMinutes={dayISO === todayISO ? nowMinutes : null}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
