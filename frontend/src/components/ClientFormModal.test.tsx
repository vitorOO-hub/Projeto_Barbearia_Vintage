import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ClientFormModal } from "./ClientFormModal";

describe("ClientFormModal", () => {
  it("pre-fills fields from initialValues and submits the edited payload", async () => {
    const onSubmit = vi.fn();
    render(
      <ClientFormModal
        initialValues={{ name: "João Silva", email: "joao@x.com", notes: "Prefere corte curto" }}
        onSubmit={onSubmit}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByLabelText("Nome")).toHaveValue("João Silva");
    expect(screen.getByLabelText("E-mail")).toHaveValue("joao@x.com");
    expect(screen.getByLabelText("Observações")).toHaveValue("Prefere corte curto");

    await userEvent.clear(screen.getByLabelText("Nome"));
    await userEvent.type(screen.getByLabelText("Nome"), "João S. Silva");
    await userEvent.click(screen.getByRole("button", { name: "Salvar cliente" }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: "João S. Silva",
      email: "joao@x.com",
      notes: "Prefere corte curto",
    });
  });

  it("disables the save button when the name is cleared", async () => {
    render(
      <ClientFormModal
        initialValues={{ name: "João Silva", email: null, notes: null }}
        onSubmit={vi.fn()}
        onClose={vi.fn()}
      />
    );

    await userEvent.clear(screen.getByLabelText("Nome"));
    expect(screen.getByRole("button", { name: "Salvar cliente" })).toBeDisabled();
  });

  it("calls onClose when Cancelar is clicked", async () => {
    const onClose = vi.fn();
    render(
      <ClientFormModal initialValues={{ name: "João Silva", email: null, notes: null }} onSubmit={vi.fn()} onClose={onClose} />
    );

    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onClose).toHaveBeenCalled();
  });
});
