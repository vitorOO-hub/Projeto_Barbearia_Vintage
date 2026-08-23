import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { apiClient } from "../api/client";
import { AppointmentFormModal } from "./AppointmentFormModal";

vi.mock("../api/client", async () => {
  const actual = await vi.importActual<typeof import("../api/client")>("../api/client");
  return { ...actual, apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() } };
});

describe("AppointmentFormModal", () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      if (url === "/api/v1/barbers") {
        return Promise.resolve({ data: [{ id: "b1", name: "Carlos Silva" }] });
      }
      return Promise.resolve({ data: [] });
    });
  });

  it("enables Salvar agendamento only after cabeleireiro is chosen, and submits barber_id", async () => {
    const onSubmit = vi.fn();
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <AppointmentFormModal
          date="2026-08-25"
          initialValues={{
            client_id: "c1",
            client_name: "João Silva",
            service_id: "s1",
            barber_id: "",
            appointment_time: "14:00:00",
          }}
          onSubmit={onSubmit}
          onClose={vi.fn()}
        />
      </QueryClientProvider>
    );
    await waitFor(() => expect(screen.getByText("Carlos Silva")).toBeInTheDocument());

    const saveButton = screen.getByRole("button", { name: "Salvar agendamento" });
    expect(saveButton).toBeDisabled();

    await userEvent.selectOptions(screen.getByLabelText("Cabeleireiro"), "b1");
    expect(saveButton).not.toBeDisabled();

    await userEvent.click(saveButton);
    expect(onSubmit).toHaveBeenCalledWith({
      client_id: "c1",
      service_id: "s1",
      barber_id: "b1",
      appointment_time: "14:00:00",
    });
  });
});
