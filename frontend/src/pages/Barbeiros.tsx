import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createBarber, deleteBarber, fetchBarbers, updateBarber, type Barber } from "../api/barbers";
import { ConfirmModal } from "../components/ConfirmModal";
import { translateApiError } from "../api/errors";
import { useToast } from "../context/ToastContext";

export function Barbeiros() {
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
      toast.success("Barbeiro cadastrado com sucesso.");
      setName("");
    },
    onError: (error) => toast.error(translateApiError(error)),
  });

  const editMutation = useMutation({
    mutationFn: (payload: { id: string; name: string }) => updateBarber(payload.id, { name: payload.name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["barbers-page"] });
      queryClient.invalidateQueries({ queryKey: ["barbers"] });
      toast.success("Barbeiro atualizado.");
      setEditTarget(null);
    },
    onError: (error) => toast.error(translateApiError(error)),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => deleteBarber(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["barbers-page"] });
      queryClient.invalidateQueries({ queryKey: ["barbers"] });
      toast.success("Barbeiro removido.");
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
      <h1 className="page-title">Barbeiros</h1>

      <div className="card mt-4 flex flex-wrap items-end gap-2">
        <div>
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
        <button onClick={() => createMutation.mutate()} disabled={!name} className="btn-primary">
          Salvar barbeiro
        </button>
      </div>

      <ul className="mt-4">
        {barbers.map((b) => (
          <li key={b.id} className="list-row">
            {editTarget?.id === b.id ? (
              <>
                <input
                  aria-label="Editar nome do barbeiro"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="field-input mt-0"
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
              </>
            ) : (
              <>
                <p className="font-medium text-ink">{b.name}</p>
                <div className="flex items-center gap-3">
                  <button onClick={() => startEdit(b)} className="link-action" aria-label="Editar barbeiro">
                    Editar barbeiro
                  </button>
                  <button onClick={() => setRemoveTarget(b)} className="link-danger" aria-label="Remover barbeiro">
                    Remover barbeiro
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
        {barbers.length === 0 && <p className="empty-state">Nenhum barbeiro encontrado.</p>}
      </ul>

      <ConfirmModal
        open={removeTarget !== null}
        title="Remover barbeiro"
        message={`Tem certeza que deseja remover ${removeTarget?.name}? Agendamentos existentes impedem a remoção.`}
        onCancel={() => setRemoveTarget(null)}
        onConfirm={() => removeTarget && removeMutation.mutate(removeTarget.id)}
      />
    </div>
  );
}
