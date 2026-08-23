import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ClientFormModal } from "./ClientFormModal";

describe("ClientFormModal", () => {
  it("pre-fills fields from initialValues and submits the edited payload", async () => {
    const onSubmit = vi.fn();
    render(
      <ClientFormModal
        initialValues={{ name: "João Silva", email: "joao@x.com", phone: "(11) 957645612", notes: "Prefere corte curto" }}
        onSubmit={onSubmit}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByLabelText("Nome")).toHaveValue("João Silva");
    expect(screen.getByLabelText("E-mail")).toHaveValue("joao@x.com");
    expect(screen.getByLabelText("Telefone")).toHaveValue("(11) 957645612");
    expect(screen.getByLabelText("Observações")).toHaveValue("Prefere corte curto");

    await userEvent.clear(screen.getByLabelText("Nome"));
    await userEvent.type(screen.getByLabelText("Nome"), "João S. Silva");
    await userEvent.click(screen.getByRole("button", { name: "Salvar cliente" }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: "João S. Silva",
      email: "joao@x.com",
      phone: "(11) 957645612",
      notes: "Prefere corte curto",
    });
  });

  it("shows a placeholder example for the phone field", () => {
    render(
      <ClientFormModal
        initialValues={{ name: "João Silva", email: "joao@x.com", phone: null, notes: null }}
        onSubmit={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByPlaceholderText("(11) 957645612")).toBeInTheDocument();
  });

  it("disables the save button when the name is cleared", async () => {
    render(
      <ClientFormModal
        initialValues={{ name: "João Silva", email: "joao@x.com", phone: null, notes: null }}
        onSubmit={vi.fn()}
        onClose={vi.fn()}
      />
    );

    await userEvent.clear(screen.getByLabelText("Nome"));
    expect(screen.getByRole("button", { name: "Salvar cliente" })).toBeDisabled();
  });

  it("disables the save button when the email is cleared", async () => {
    render(
      <ClientFormModal
        initialValues={{ name: "João Silva", email: "joao@x.com", phone: null, notes: null }}
        onSubmit={vi.fn()}
        onClose={vi.fn()}
      />
    );

    await userEvent.clear(screen.getByLabelText("E-mail"));
    expect(screen.getByRole("button", { name: "Salvar cliente" })).toBeDisabled();
  });

  it("calls onClose when Cancelar is clicked", async () => {
    const onClose = vi.fn();
    render(
      <ClientFormModal
        initialValues={{ name: "João Silva", email: "joao@x.com", phone: null, notes: null }}
        onSubmit={vi.fn()}
        onClose={onClose}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onClose).toHaveBeenCalled();
  });
});
