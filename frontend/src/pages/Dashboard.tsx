import { useQuery } from "@tanstack/react-query";
import { fetchDashboardSummary } from "../api/dashboard";

export function Dashboard() {
  const { data, isLoading } = useQuery({ queryKey: ["dashboard-summary"], queryFn: fetchDashboardSummary });

  if (isLoading || !data) {
    return <div className="loading-state">Carregando...</div>;
  }

  return (
    <div className="page-shell">
      <h1 className="page-title">Resumo</h1>

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
    </div>
  );
}
