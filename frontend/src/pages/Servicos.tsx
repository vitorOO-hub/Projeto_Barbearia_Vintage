import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createService, fetchServices, toggleServiceActive } from "../api/services";
import { formatCurrencyBR } from "../lib/format";
import { translateApiError } from "../api/errors";
import { useToast } from "../context/ToastContext";

export function Servicos() {
  const [name, setName] = useState("");
  const [duration, setDuration] = useState(30);
  const [price, setPrice] = useState(0);
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: services = [] } = useQuery({ queryKey: ["services-page"], queryFn: fetchServices });

  const createMutation = useMutation({
    mutationFn: () => createService({ name, duration_minutes: duration, price }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services-page"] });
      toast.success("Serviço cadastrado.");
      setName("");
      setDuration(30);
      setPrice(0);
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

  return (
    <div className="mx-auto max-w-3xl p-4">
      <h1 className="text-xl font-semibold">Serviços</h1>

      <div className="mt-4 flex flex-wrap gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome" className="rounded border px-3 py-2" />
        <input
          type="number"
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
          placeholder="Duração (min)"
          className="w-32 rounded border px-3 py-2"
        />
        <input
          type="number"
          value={price}
          onChange={(e) => setPrice(Number(e.target.value))}
          placeholder="Preço"
          className="w-32 rounded border px-3 py-2"
        />
        <button onClick={() => createMutation.mutate()} disabled={!name} className="rounded bg-gray-900 px-4 py-2 text-white disabled:opacity-50">
          Salvar serviço
        </button>
      </div>

      <ul className="mt-4 divide-y">
        {services.map((s) => (
          <li key={s.id} className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium">{s.name}</p>
              <p className="text-sm text-gray-500">
                {s.duration_minutes} min · {formatCurrencyBR(s.price)}
              </p>
            </div>
            <button
              onClick={() => toggleMutation.mutate({ id: s.id, active: !s.active })}
              className="text-sm text-gray-700 hover:underline"
            >
              {s.active ? "Desativar" : "Ativar"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
