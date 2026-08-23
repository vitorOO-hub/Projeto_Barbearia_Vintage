import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchDashboardHistory, type WeekRevenue } from "../api/dashboard";
import { formatCurrencyBR, formatDateBR } from "../lib/format";

interface OverviewModalProps {
  onClose: () => void;
}

function WeekCard({ week }: { week: WeekRevenue }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <li className="card mt-2">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full flex-wrap items-center justify-between gap-3 text-left"
      >
        <span className="font-medium text-ink">
          {formatDateBR(week.week_start)} – {formatDateBR(week.week_end)}
        </span>
        <span className="flex items-center gap-3">
          <span className="text-sm text-ink-soft">{week.appointments_count} atendimento(s)</span>
          <span className="font-medium text-ink">{formatCurrencyBR(week.total)}</span>
        </span>
      </button>

      {expanded && (
        <ul className="mt-3 border-t border-line pt-2">
          {week.by_barber.map((b) => (
            <li key={b.barber_name} className="list-row py-2">
              <span className="text-sm text-ink">{b.barber_name}</span>
              <span className="text-sm font-medium text-ink-soft">{formatCurrencyBR(b.total)}</span>
            </li>
          ))}
          {week.by_barber.length === 0 && <p className="py-2 text-sm text-ink-soft">Sem atendimentos concluídos.</p>}
        </ul>
      )}
    </li>
  );
}

export function OverviewModal({ onClose }: OverviewModalProps) {
  const { data, isLoading } = useQuery({ queryKey: ["dashboard-history"], queryFn: fetchDashboardHistory });

  return (
    <div role="dialog" className="modal-backdrop">
      <div className="modal-panel max-w-lg">
        <h2 className="modal-title">Visão geral</h2>

        {isLoading || !data ? (
          <p className="loading-state">Carregando...</p>
        ) : (
          <>
            <div className="card mt-4">
              <p className="text-sm text-ink-soft">Faturamento do mês</p>
              <p className="font-display text-3xl font-semibold text-ink">{formatCurrencyBR(data.current_month_total)}</p>
            </div>

            <h3 className="section-title">Histórico semanal</h3>
            <ul>
              {data.weeks.map((week) => (
                <WeekCard key={week.week_start} week={week} />
              ))}
            </ul>
          </>
        )}

        <div className="modal-actions">
          <button onClick={onClose} className="btn-ghost">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
