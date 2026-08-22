import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "./StatusBadge";

describe("StatusBadge", () => {
  it("renders green for concluido", () => {
    render(<StatusBadge status="concluido" />);
    expect(screen.getByText("Concluído")).toHaveClass("bg-green-100");
  });

  it("renders blue for agendado", () => {
    render(<StatusBadge status="agendado" />);
    expect(screen.getByText("Agendado")).toHaveClass("bg-blue-100");
  });

  it("renders gray for cancelado", () => {
    render(<StatusBadge status="cancelado" />);
    expect(screen.getByText("Cancelado")).toHaveClass("bg-gray-100");
  });

  it("renders red for nao_compareceu", () => {
    render(<StatusBadge status="nao_compareceu" />);
    expect(screen.getByText("Não compareceu")).toHaveClass("bg-red-100");
  });
});
