export type AppointmentStatus = "agendado" | "concluido" | "cancelado" | "nao_compareceu";

const STATUS_MAP: Record<AppointmentStatus, { label: string; className: string }> = {
  agendado: { label: "Agendado", className: "bg-blue-100 text-blue-800" },
  concluido: { label: "Concluído", className: "bg-green-100 text-green-800" },
  cancelado: { label: "Cancelado", className: "bg-gray-100 text-gray-800" },
  nao_compareceu: { label: "Não compareceu", className: "bg-red-100 text-red-800" },
};

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  const { label, className } = STATUS_MAP[status];
  return <span className={`rounded-full px-2 py-1 text-xs font-medium ${className}`}>{label}</span>;
}
