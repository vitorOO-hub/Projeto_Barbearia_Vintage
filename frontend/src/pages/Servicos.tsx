import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createService, deleteService, fetchServices, toggleServiceActive, type Service } from "../api/services";
import { ConfirmModal } from "../components/ConfirmModal";
import { formatCurrencyBR } from "../lib/format";
import { translateApiError } from "../api/errors";
import { useToast } from "../context/ToastContext";

export function Servicos() {
  const [name, setName] = useState("");
  const [duration, setDuration] = useState<number | "">("");
  const [price, setPrice] = useState<number | "">("");
  const [deleteTarget, setDeleteTarget] = useState<Service | null>(null);
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: services = [] } = useQuery({ queryKey: ["services-page"], queryFn: fetchServices });

  const createMutation = useMutation({
    mutationFn: () => createService({ name, duration_minutes: Number(duration), price: Number(price) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services-page"] });
      toast.success("Serviço cadastrado.");
      setName("");
      setDuration("");
      setPrice("");
    },
    onError: (error) => toast.error(translateApiError(error)),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => toggleServiceActive(id, active),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services-page"] });
      toast.success("Serviço atualizado.");
    },
    onError: (error) => toast.error(translateApiError(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteService(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services-page"] });
      toast.success("Serviço excluído.");
      setDeleteTarget(null);
    },
    onError: (error) => toast.error(translateApiError(error)),
  });

  return (
    <div className="page-shell">
      <h1 className="page-title">Serviços</h1>

      <div className="card mt-4 flex flex-wrap items-end gap-2">
        <div className="w-full sm:w-auto">
          <label htmlFor="service-name" className="field-label">
            Nome
          </label>
          <input
            id="service-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Corte de cabelo"
            className="field-input"
          />
        </div>
        <div className="w-full sm:w-auto">
          <label htmlFor="service-duration" className="field-label">
            Duração em minutos
          </label>
          <input
            id="service-duration"
            type="number"
            value={duration}
            onChange={(e) => setDuration(e.target.value === "" ? "" : Number(e.target.value))}
            placeholder="Ex: 30"
            className="field-input sm:w-36"
          />
        </div>
        <div className="w-full sm:w-auto">
          <label htmlFor="service-price" className="field-label">
            Preço em reais
          </label>
          <input
            id="service-price"
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value === "" ? "" : Number(e.target.value))}
            placeholder="R$ 0,00"
            className="field-input sm:w-36"
          />
        </div>
        <button
          onClick={() => createMutation.mutate()}
          disabled={!name || duration === "" || price === ""}
          className="btn-primary w-full sm:w-auto"
        >
          Salvar serviço
        </button>
      </div>

      <ul className="mt-4">
        {services.map((s) => (
          <li key={s.id} className="list-row">
            <div className="min-w-0">
              <p className="font-medium text-ink">
                {s.name} {!s.active && <span className="badge-neutral ml-1">Inativo</span>}
              </p>
              <p className="text-sm text-ink-soft">
                {s.duration_minutes} min · {formatCurrencyBR(s.price)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button onClick={() => toggleMutation.mutate({ id: s.id, active: !s.active })} className="link-action">
                {s.active ? "Desativar" : "Ativar"}
              </button>
              <button onClick={() => setDeleteTarget(s)} className="link-danger" aria-label="Excluir serviço">
                Excluir serviço
              </button>
            </div>
          </li>
        ))}
        {services.length === 0 && <p className="empty-state">Nenhum serviço cadastrado.</p>}
      </ul>

      <ConfirmModal
        open={deleteTarget !== null}
        title="Excluir serviço"
        message={`Tem certeza que deseja excluir ${deleteTarget?.name} definitivamente? Essa ação não pode ser desfeita. Se houver agendamentos vinculados, a exclusão será bloqueada.`}
        confirmLabel="Excluir"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </div>
  );
}
