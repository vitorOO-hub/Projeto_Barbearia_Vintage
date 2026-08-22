import { useQuery } from "@tanstack/react-query";
import { fetchDashboardSummary } from "../api/dashboard";

export function Dashboard() {
  const { data, isLoading } = useQuery({ queryKey: ["dashboard-summary"], queryFn: fetchDashboardSummary });

  if (isLoading || !data) {
    return <div className="p-4 text-gray-500">Carregando...</div>;
  }

  return (
    <div className="mx-auto max-w-3xl p-4">
      <h1 className="text-xl font-semibold">Resumo</h1>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="rounded-lg bg-white p-4 shadow">
          <p className="text-sm text-gray-500">Atendimentos hoje</p>
          <p className="text-3xl font-semibold">{data.appointments_today}</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow">
          <p className="text-sm text-gray-500">Atendimentos na semana</p>
          <p className="text-3xl font-semibold">{data.appointments_this_week}</p>
        </div>
      </div>

      <h2 className="mt-6 text-lg font-medium">Serviços mais procurados</h2>
      <ul className="mt-2 divide-y">
        {data.top_services.map((s) => (
          <li key={s.service_name} className="flex justify-between py-2">
            <span>{s.service_name}</span>
            <span className="text-gray-500">{s.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
