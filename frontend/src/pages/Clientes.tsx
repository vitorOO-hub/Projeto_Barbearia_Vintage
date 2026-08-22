import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient, deactivateClient, fetchClients, type Client } from "../api/clients";
import { ConfirmModal } from "../components/ConfirmModal";
import { translateApiError } from "../api/errors";
import { useToast } from "../context/ToastContext";

export function Clientes() {
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [removeTarget, setRemoveTarget] = useState<Client | null>(null);
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: clients = [] } = useQuery({ queryKey: ["clients-page", search], queryFn: () => fetchClients(search) });

  const createMutation = useMutation({
    mutationFn: () => createClient({ name, email: email || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients-page"] });
      toast.success("Cliente cadastrado com sucesso.");
      setName("");
      setEmail("");
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

  return (
    <div className="mx-auto max-w-3xl p-4">
      <h1 className="text-xl font-semibold">Clientes</h1>

      <div className="mt-4 flex gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome" className="rounded border px-3 py-2" />
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail (opcional)" className="rounded border px-3 py-2" />
        <button
          onClick={() => createMutation.mutate()}
          disabled={!name}
          className="rounded bg-gray-900 px-4 py-2 text-white disabled:opacity-50"
        >
          Salvar cliente
        </button>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por nome"
        className="mt-4 w-full rounded border px-3 py-2"
      />

      <ul className="mt-4 divide-y">
        {clients.map((c) => (
          <li key={c.id} className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium">{c.name}</p>
              {c.email && <p className="text-sm text-gray-500">{c.email}</p>}
            </div>
            <button onClick={() => setRemoveTarget(c)} className="text-sm text-red-600 hover:underline" aria-label="Remover cliente">
              Remover cliente
            </button>
          </li>
        ))}
      </ul>

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
