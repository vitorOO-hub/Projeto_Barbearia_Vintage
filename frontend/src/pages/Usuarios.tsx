import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createUser, deleteUser, fetchUsers, updateUser, type User } from "../api/users";
import { translateApiError } from "../api/errors";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import { ConfirmModal } from "../components/ConfirmModal";
import { UserFormModal } from "../components/UserFormModal";

export function Usuarios() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [removeTarget, setRemoveTarget] = useState<User | null>(null);
  const queryClient = useQueryClient();
  const toast = useToast();
  const { user: currentUser } = useAuth();

  const { data: users = [] } = useQuery({ queryKey: ["users"], queryFn: fetchUsers });

  const createMutation = useMutation({
    mutationFn: () => createUser({ name, email, password, is_admin: isAdmin }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Usuário cadastrado com sucesso.");
      setName("");
      setEmail("");
      setPassword("");
      setIsAdmin(false);
    },
    onError: (error) => toast.error(translateApiError(error)),
  });

  const editMutation = useMutation({
    mutationFn: (payload: { id: string; name: string; email: string; is_admin: boolean }) =>
      updateUser(payload.id, { name: payload.name, email: payload.email, is_admin: payload.is_admin }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Usuário atualizado.");
      setEditTarget(null);
    },
    onError: (error) => toast.error(translateApiError(error)),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Usuário removido.");
      setRemoveTarget(null);
    },
    onError: (error) => toast.error(translateApiError(error)),
  });

  return (
    <div className="page-shell">
      <h1 className="page-title">Usuários</h1>

      <div className="card mt-4 flex flex-wrap items-end gap-2">
        <div>
          <label htmlFor="user-name-new" className="field-label">
            Nome
          </label>
          <input id="user-name-new" value={name} onChange={(e) => setName(e.target.value)} className="field-input" />
        </div>
        <div>
          <label htmlFor="user-email-new" className="field-label">
            E-mail
          </label>
          <input
            id="user-email-new"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="field-input"
          />
        </div>
        <div>
          <label htmlFor="user-password-new" className="field-label">
            Senha
          </label>
          <input
            id="user-password-new"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="field-input"
          />
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm text-ink">
          <input type="checkbox" checked={isAdmin} onChange={(e) => setIsAdmin(e.target.checked)} />
          Administrador
        </label>
        <button
          onClick={() => createMutation.mutate()}
          disabled={!name || !email || !password}
          className="btn-primary"
        >
          Salvar usuário
        </button>
      </div>

      <ul className="mt-4">
        {users.map((u) => (
          <li key={u.id} className="list-row">
            <div>
              <p className="font-medium text-ink">{u.name}</p>
              <p className="text-sm text-ink-soft">
                {u.email} {u.is_admin && "· Administrador"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setEditTarget(u)} className="link-action" aria-label="Editar usuário">
                Editar usuário
              </button>
              <button
                onClick={() => setRemoveTarget(u)}
                disabled={u.id === currentUser?.id}
                className="link-danger"
                aria-label="Remover usuário"
              >
                Remover usuário
              </button>
            </div>
          </li>
        ))}
        {users.length === 0 && <p className="empty-state">Nenhum usuário encontrado.</p>}
      </ul>

      {editTarget && (
        <UserFormModal
          initialValues={{ name: editTarget.name, email: editTarget.email, is_admin: editTarget.is_admin }}
          onClose={() => setEditTarget(null)}
          onSubmit={(data) => editMutation.mutate({ id: editTarget.id, ...data })}
        />
      )}

      <ConfirmModal
        open={removeTarget !== null}
        title="Remover usuário"
        message={`Tem certeza que deseja remover ${removeTarget?.name}? Esta ação não pode ser desfeita.`}
        onCancel={() => setRemoveTarget(null)}
        onConfirm={() => removeTarget && removeMutation.mutate(removeTarget.id)}
      />
    </div>
  );
}
