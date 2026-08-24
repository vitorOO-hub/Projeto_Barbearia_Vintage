import { useState } from "react";

interface ServiceFormModalProps {
  initialValues: {
    name: string;
    duration_minutes: number;
    price: number;
  };
  onSubmit: (data: { name: string; duration_minutes: number; price: number }) => void;
  onClose: () => void;
}

export function ServiceFormModal({ initialValues, onSubmit, onClose }: ServiceFormModalProps) {
  const [name, setName] = useState(initialValues.name);
  const [duration, setDuration] = useState<number | "">(initialValues.duration_minutes);
  const [price, setPrice] = useState<number | "">(initialValues.price);

  return (
    <div role="dialog" className="modal-backdrop">
      <div className="modal-panel">
        <h2 className="modal-title">Editar serviço</h2>

        <label htmlFor="service-edit-name" className="field-label mt-4">
          Nome
        </label>
        <input
          id="service-edit-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="field-input"
        />

        <label htmlFor="service-edit-duration" className="field-label mt-4">
          Duração em minutos
        </label>
        <input
          id="service-edit-duration"
          type="number"
          value={duration}
          onChange={(e) => setDuration(e.target.value === "" ? "" : Number(e.target.value))}
          className="field-input"
        />

        <label htmlFor="service-edit-price" className="field-label mt-4">
          Preço em reais
        </label>
        <input
          id="service-edit-price"
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value === "" ? "" : Number(e.target.value))}
          className="field-input"
        />

        <div className="modal-actions">
          <button onClick={onClose} className="btn-ghost">
            Cancelar
          </button>
          <button
            onClick={() => onSubmit({ name, duration_minutes: Number(duration), price: Number(price) })}
            disabled={!name || duration === "" || price === ""}
            className="btn-primary"
          >
            Salvar serviço
          </button>
        </div>
      </div>
    </div>
  );
}
