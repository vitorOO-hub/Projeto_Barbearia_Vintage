import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchDashboardRevenue, fetchDashboardSummary } from "../api/dashboard";
import { useAuth } from "../context/AuthContext";
import { formatCurrencyBR } from "../lib/format";
import { OverviewModal } from "../components/OverviewModal";

export function Dashboard() {
  const { user } = useAuth();
  const [showOverview, setShowOverview] = useState(false);
  const { data, isLoading } = useQuery({ queryKey: ["dashboard-summary"], queryFn: fetchDashboardSummary });
  const { data: revenue } = useQuery({
    queryKey: ["dashboard-revenue"],
    queryFn: fetchDashboardRevenue,
    enabled: Boolean(user?.is_admin),
  });

  if (isLoading || !data) {
    return <div className="loading-state">Carregando...</div>;
  }

  return (
    <div className="page-shell">
      <div className="page-header">
        <h1 className="page-title">Resumo</h1>
        {user?.is_admin && (
          <button onClick={() => setShowOverview(true)} className="btn-secondary">
            Visão geral
          </button>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="card">
          <p className="text-sm text-ink-soft">Atendimentos hoje</p>
          <p className="font-display text-3xl font-semibold text-ink">{data.appointments_today}</p>
        </div>
        <div className="card">
          <p className="text-sm text-ink-soft">Atendimentos na semana</p>
          <p className="font-display text-3xl font-semibold text-ink">{data.appointments_this_week}</p>
        </div>
      </div>

      <h2 className="section-title">Serviços mais procurados</h2>
      <ul className="card mt-2 py-0">
        {data.top_services.map((s) => (
          <li key={s.service_name} className="list-row">
            <span className="text-ink">{s.service_name}</span>
            <span className="font-medium text-ink-soft">{s.count}</span>
          </li>
        ))}
        {data.top_services.length === 0 && <p className="py-3 text-ink-soft">Sem dados ainda.</p>}
      </ul>

      {user?.is_admin && revenue && (
        <>
          <h2 className="section-title">Faturamento da semana</h2>
          <div className="card mt-2">
            <p className="text-sm text-ink-soft">Total (atendimentos concluídos)</p>
            <p className="font-display text-3xl font-semibold text-ink">{formatCurrencyBR(revenue.total_this_week)}</p>
          </div>
          <ul className="card mt-2 py-0">
            {revenue.by_barber.map((b) => (
              <li key={b.barber_name} className="list-row">
                <span className="text-ink">{b.barber_name}</span>
                <span className="font-medium text-ink-soft">{formatCurrencyBR(b.total)}</span>
              </li>
            ))}
            {revenue.by_barber.length === 0 && <p className="py-3 text-ink-soft">Sem dados ainda.</p>}
          </ul>
        </>
      )}

      {showOverview && <OverviewModal onClose={() => setShowOverview(false)} />}
    </div>
  );
}
