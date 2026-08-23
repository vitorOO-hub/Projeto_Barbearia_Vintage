import { useState } from "react";

interface UserFormModalProps {
  initialValues: {
    name: string;
    email: string;
    is_admin: boolean;
  };
  onSubmit: (data: { name: string; email: string; is_admin: boolean }) => void;
  onClose: () => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_ERROR = "O e-mail deve ser do tipo email@gmail.com";

export function UserFormModal({ initialValues, onSubmit, onClose }: UserFormModalProps) {
  const [name, setName] = useState(initialValues.name);
  const [email, setEmail] = useState(initialValues.email);
  const [isAdmin, setIsAdmin] = useState(initialValues.is_admin);
  const emailInvalid = email.length > 0 && !EMAIL_REGEX.test(email);

  return (
    <div role="dialog" className="modal-backdrop">
      <div className="modal-panel">
        <h2 className="modal-title">Editar usuário</h2>

        <label htmlFor="user-name" className="field-label mt-4">
          Nome
        </label>
        <input id="user-name" value={name} onChange={(e) => setName(e.target.value)} className="field-input" />

        <label htmlFor="user-email" className="field-label mt-4">
          E-mail
        </label>
        <input
          id="user-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="field-input"
        />
        {emailInvalid && <p className="field-error">{EMAIL_ERROR}</p>}

        <label className="flex items-center gap-2 pt-4 text-sm text-ink">
          <input type="checkbox" checked={isAdmin} onChange={(e) => setIsAdmin(e.target.checked)} />
          Administrador
        </label>

        <div className="modal-actions">
          <button onClick={onClose} className="btn-ghost">
            Cancelar
          </button>
          <button
            onClick={() => onSubmit({ name, email, is_admin: isAdmin })}
            disabled={!name || !email || emailInvalid}
            className="btn-primary"
          >
            Salvar usuário
          </button>
        </div>
      </div>
    </div>
  );
}
