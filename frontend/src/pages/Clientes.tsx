import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient, deactivateClient, fetchClients, updateClient, type Client } from "../api/clients";
import { ConfirmModal } from "../components/ConfirmModal";
import { ClientFormModal } from "../components/ClientFormModal";
import { translateApiError } from "../api/errors";
import { useToast } from "../context/ToastContext";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function Clientes() {
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const emailInvalid = email.length > 0 && !EMAIL_REGEX.test(email);
  const [removeTarget, setRemoveTarget] = useState<Client | null>(null);
  const [editTarget, setEditTarget] = useState<Client | null>(null);
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: clients = [] } = useQuery({ queryKey: ["clients-page", search], queryFn: () => fetchClients(search) });

  const createMutation = useMutation({
    mutationFn: () => createClient({ name, email, phone: phone || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients-page"] });
      toast.success("Cliente cadastrado com sucesso.");
      setName("");
      setEmail("");
      setPhone("");
    },
    onError: (error) => toast.error(translateApiError(error)),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => deactivateClient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients-page"] });
      toast.success("Cliente removido.");
      setRemoveTarget(null);
    },
    onError: (error) => toast.error(translateApiError(error)),
  });

  const editMutation = useMutation({
    mutationFn: (payload: { id: string; name: string; email: string; phone?: string; notes?: string }) =>
      updateClient(payload.id, { name: payload.name, email: payload.email, phone: payload.phone, notes: payload.notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients-page"] });
      toast.success("Cliente atualizado.");
      setEditTarget(null);
    },
    onError: (error) => toast.error(translateApiError(error)),
  });

  return (
    <div className="page-shell">
      <h1 className="page-title">Clientes</h1>

      <div className="card mt-4 flex flex-wrap items-end gap-2">
        <div>
          <label htmlFor="client-name-new" className="field-label">
            Nome
          </label>
          <input
            id="client-name-new"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome"
            className="field-input"
          />
        </div>
        <div>
          <label htmlFor="client-email-new" className="field-label">
            E-mail
          </label>
          <input
            id="client-email-new"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-mail"
            required
            className="field-input"
          />
        </div>
        <div>
          <label htmlFor="client-phone-new" className="field-label">
            Telefone
          </label>
          <input
            id="client-phone-new"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(11) 957645612"
            className="field-input"
          />
        </div>
        <button
          onClick={() => createMutation.mutate()}
          disabled={!name || !email || emailInvalid}
          className="btn-primary"
        >
          Salvar cliente
        </button>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por nome"
        aria-label="Buscar cliente por nome"
        className="field-input mt-4"
      />

      <ul className="mt-4">
        {clients.map((c) => (
          <li key={c.id} className="list-row">
            <div>
              <p className="font-medium text-ink">{c.name}</p>
              {c.email && <p className="text-sm text-ink-soft">{c.email}</p>}
              {c.phone && <p className="text-sm text-ink-soft">{c.phone}</p>}
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setEditTarget(c)} className="link-action" aria-label="Editar cliente">
                Editar cliente
              </button>
              <button onClick={() => setRemoveTarget(c)} className="link-danger" aria-label="Remover cliente">
                Remover cliente
              </button>
            </div>
          </li>
        ))}
        {clients.length === 0 && <p className="empty-state">Nenhum cliente encontrado.</p>}
      </ul>

      {editTarget && (
        <ClientFormModal
          initialValues={{ name: editTarget.name, email: editTarget.email, phone: editTarget.phone, notes: editTarget.notes }}
          onClose={() => setEditTarget(null)}
          onSubmit={(data) => editMutation.mutate({ id: editTarget.id, ...data })}
        />
      )}

      <ConfirmModal
        open={removeTarget !== null}
        title="Remover cliente"
        message={`Tem certeza que deseja remover ${removeTarget?.name}? O histórico de agendamentos será mantido.`}
        onCancel={() => setRemoveTarget(null)}
        onConfirm={() => removeTarget && removeMutation.mutate(removeTarget.id)}
      />
    </div>
  );
}
