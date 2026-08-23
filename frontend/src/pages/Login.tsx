import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { translateApiError } from "../api/errors";

const loginSchema = z.object({
  email: z.string().email("Informe um e-mail válido."),
  password: z.string().min(1, "Informe a senha."),
});

type LoginForm = z.infer<typeof loginSchema>;

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(data: LoginForm) {
    setServerError(null);
    try {
      await login(data.email, data.password);
      navigate("/agenda");
    } catch (error) {
      setServerError(translateApiError(error));
    }
  }

  return (
    <div className="auth-shell">
      <form onSubmit={handleSubmit(onSubmit)} className="auth-card">
        <div className="text-center">
          <h1 className="font-display text-2xl font-semibold text-ink">Barbearia Vintage</h1>
          <p className="mt-1 text-sm text-ink-soft">Entre para gerenciar a agenda</p>
        </div>

        <div>
          <label htmlFor="email" className="field-label">
            E-mail
          </label>
          <input id="email" type="email" {...register("email")} className="field-input" />
          {errors.email && <p className="field-error">{errors.email.message}</p>}
        </div>

        <div>
          <label htmlFor="password" className="field-label">
            Senha
          </label>
          <input id="password" type="password" {...register("password")} className="field-input" />
          {errors.password && <p className="field-error">{errors.password.message}</p>}
        </div>

        {serverError && <p className="field-error">{serverError}</p>}

        <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
          Entrar
        </button>
      </form>
    </div>
  );
}
