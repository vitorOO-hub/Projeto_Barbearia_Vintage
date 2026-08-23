import { useState } from "react";

interface ClientFormModalProps {
  initialValues: {
    name: string;
    email: string | null;
    phone: string | null;
    notes: string | null;
  };
  onSubmit: (data: { name: string; email: string; phone?: string; notes?: string }) => void;
  onClose: () => void;
}

export function ClientFormModal({ initialValues, onSubmit, onClose }: ClientFormModalProps) {
  const [name, setName] = useState(initialValues.name);
  const [email, setEmail] = useState(initialValues.email ?? "");
  const [phone, setPhone] = useState(initialValues.phone ?? "");
  const [notes, setNotes] = useState(initialValues.notes ?? "");

  return (
    <div role="dialog" className="fixed inset-0 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
        <h2 className="text-lg font-semibold">Editar cliente</h2>

        <label htmlFor="client-name" className="mt-4 block text-sm font-medium text-gray-700">
          Nome
        </label>
        <input
          id="client-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded border px-3 py-2"
        />

        <label htmlFor="client-email" className="mt-4 block text-sm font-medium text-gray-700">
          E-mail
        </label>
        <input
          id="client-email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="mt-1 w-full rounded border px-3 py-2"
        />

        <label htmlFor="client-phone" className="mt-4 block text-sm font-medium text-gray-700">
          Telefone
        </label>
        <input
          id="client-phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Telefone"
          className="mt-1 w-full rounded border px-3 py-2"
        />

        <label htmlFor="client-notes" className="mt-4 block text-sm font-medium text-gray-700">
          Observações
        </label>
        <textarea
          id="client-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="mt-1 w-full rounded border px-3 py-2"
        />

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded px-4 py-2 text-gray-700 hover:bg-gray-100">
            Cancelar
          </button>
          <button
            onClick={() => onSubmit({ name, email, phone: phone || undefined, notes: notes || undefined })}
            disabled={!name || !email}
            className="rounded bg-gray-900 px-4 py-2 text-white disabled:opacity-50"
          >
            Salvar cliente
          </button>
        </div>
      </div>
    </div>
  );
}
