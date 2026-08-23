import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "./StatusBadge";

describe("StatusBadge", () => {
  it("renders success style for concluido", () => {
    render(<StatusBadge status="concluido" />);
    expect(screen.getByText("Concluído")).toHaveClass("badge-success");
  });

  it("renders info style for agendado", () => {
    render(<StatusBadge status="agendado" />);
    expect(screen.getByText("Agendado")).toHaveClass("badge-info");
  });

  it("renders neutral style for cancelado", () => {
    render(<StatusBadge status="cancelado" />);
    expect(screen.getByText("Cancelado")).toHaveClass("badge-neutral");
  });

  it("renders danger style for nao_compareceu", () => {
    render(<StatusBadge status="nao_compareceu" />);
    expect(screen.getByText("Não compareceu")).toHaveClass("badge-danger");
  });
});
