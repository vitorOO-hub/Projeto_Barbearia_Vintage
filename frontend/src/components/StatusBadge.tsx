export type AppointmentStatus = "agendado" | "concluido" | "cancelado" | "nao_compareceu";

const STATUS_MAP: Record<AppointmentStatus, { label: string; className: string }> = {
  agendado: { label: "Agendado", className: "badge-info" },
  concluido: { label: "Concluído", className: "badge-success" },
  cancelado: { label: "Cancelado", className: "badge-neutral" },
  nao_compareceu: { label: "Não compareceu", className: "badge-danger" },
};

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  const { label, className } = STATUS_MAP[status];
  return <span className={className}>{label}</span>;
}
