import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createBarber, deleteBarber, fetchBarbers, updateBarber, type Barber } from "../api/barbers";
import { ConfirmModal } from "../components/ConfirmModal";
import { translateApiError } from "../api/errors";
import { useToast } from "../context/ToastContext";

export function Cabeleireiros() {
  const [name, setName] = useState("");
  const [editTarget, setEditTarget] = useState<Barber | null>(null);
  const [editName, setEditName] = useState("");
  const [removeTarget, setRemoveTarget] = useState<Barber | null>(null);
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: barbers = [] } = useQuery({ queryKey: ["barbers-page"], queryFn: fetchBarbers });

  const createMutation = useMutation({
    mutationFn: () => createBarber({ name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["barbers-page"] });
      queryClient.invalidateQueries({ queryKey: ["barbers"] });
      toast.success("Cabeleireiro cadastrado com sucesso.");
      setName("");
    },
    onError: (error) => toast.error(translateApiError(error)),
  });

  const editMutation = useMutation({
    mutationFn: (payload: { id: string; name: string }) => updateBarber(payload.id, { name: payload.name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["barbers-page"] });
      queryClient.invalidateQueries({ queryKey: ["barbers"] });
      toast.success("Cabeleireiro atualizado.");
      setEditTarget(null);
    },
    onError: (error) => toast.error(translateApiError(error)),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => deleteBarber(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["barbers-page"] });
      queryClient.invalidateQueries({ queryKey: ["barbers"] });
      toast.success("Cabeleireiro removido.");
      setRemoveTarget(null);
    },
    onError: (error) => toast.error(translateApiError(error)),
  });

  function startEdit(barber: Barber) {
    setEditTarget(barber);
    setEditName(barber.name);
  }

  return (
    <div className="page-shell">
      <h1 className="page-title">Cabeleireiros</h1>

      <div className="card mt-4 flex flex-wrap items-end gap-2">
        <div className="w-full sm:w-auto">
          <label htmlFor="barber-name-new" className="field-label">
            Nome
          </label>
          <input
            id="barber-name-new"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome"
            className="field-input"
          />
        </div>
        <button onClick={() => createMutation.mutate()} disabled={!name} className="btn-primary w-full sm:w-auto">
          Salvar cabeleireiro
        </button>
      </div>

      <ul className="mt-4">
        {barbers.map((b) => (
          <li key={b.id} className="list-row">
            {editTarget?.id === b.id ? (
              <div className="flex w-full flex-wrap items-center gap-3">
                <input
                  aria-label="Editar nome do cabeleireiro"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="field-input mt-0 min-w-[160px] flex-1"
                />
                <div className="flex items-center gap-3">
                  <button onClick={() => setEditTarget(null)} className="btn-ghost">
                    Cancelar
                  </button>
                  <button
                    onClick={() => editMutation.mutate({ id: b.id, name: editName })}
                    disabled={!editName}
                    className="btn-primary"
                  >
                    Salvar
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="min-w-0 font-medium text-ink">{b.name}</p>
                <div className="flex flex-wrap items-center gap-3">
                  <button onClick={() => startEdit(b)} className="link-action" aria-label="Editar cabeleireiro">
                    Editar cabeleireiro
                  </button>
                  <button onClick={() => setRemoveTarget(b)} className="link-danger" aria-label="Remover cabeleireiro">
                    Remover cabeleireiro
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
        {barbers.length === 0 && <p className="empty-state">Nenhum cabeleireiro encontrado.</p>}
      </ul>

      <ConfirmModal
        open={removeTarget !== null}
        title="Remover cabeleireiro"
        message={`Tem certeza que deseja remover ${removeTarget?.name}? Agendamentos existentes impedem a remoção.`}
        onCancel={() => setRemoveTarget(null)}
        onConfirm={() => removeTarget && removeMutation.mutate(removeTarget.id)}
      />
    </div>
  );
}
