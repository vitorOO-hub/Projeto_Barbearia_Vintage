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
    <div role="dialog" className="modal-backdrop">
      <div className="modal-panel">
        <h2 className="modal-title">Editar cliente</h2>

        <label htmlFor="client-name" className="field-label mt-4">
          Nome
        </label>
        <input id="client-name" value={name} onChange={(e) => setName(e.target.value)} className="field-input" />

        <label htmlFor="client-email" className="field-label mt-4">
          E-mail
        </label>
        <input id="client-email" value={email} onChange={(e) => setEmail(e.target.value)} required className="field-input" />

        <label htmlFor="client-phone" className="field-label mt-4">
          Telefone
        </label>
        <input
          id="client-phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Telefone"
          className="field-input"
        />

        <label htmlFor="client-notes" className="field-label mt-4">
          Observações
        </label>
        <textarea id="client-notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="field-input" />

        <div className="modal-actions">
          <button onClick={onClose} className="btn-ghost">
            Cancelar
          </button>
          <button
            onClick={() => onSubmit({ name, email, phone: phone || undefined, notes: notes || undefined })}
            disabled={!name || !email}
            className="btn-primary"
          >
            Salvar cliente
          </button>
        </div>
      </div>
    </div>
  );
}
