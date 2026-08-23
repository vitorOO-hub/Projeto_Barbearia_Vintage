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
      if (url === "/api/v1/clients") {
        return Promise.resolve({ data: [{ id: "c1", name: "João Silva", email: "joao@x.com" }] });
      }
      if (url === "/api/v1/appointments/check-availability") {
        return Promise.resolve({ data: { available: false, conflict_with: "10:00 – 10:45" } });
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
      appointment_date: "2026-08-25",
      appointment_time: "14:00:00",
    });
  });

  it("shows a conflict message with the busy window once barber, service and time are all filled", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <AppointmentFormModal
          date="2026-08-25"
          initialValues={{
            client_id: "c1",
            client_name: "João Silva",
            service_id: "s1",
            barber_id: "b1",
            appointment_time: "14:00:00",
          }}
          onSubmit={vi.fn()}
          onClose={vi.fn()}
        />
      </QueryClientProvider>
    );

    expect(await screen.findByText("Este barbeiro já tem atendimento das 10:00 – 10:45")).toBeInTheDocument();
  });

  it("re-checks availability against the new date when the Dia field is changed", async () => {
    vi.mocked(apiClient.get).mockImplementation((url: string, config?: Parameters<typeof apiClient.get>[1]) => {
      if (url === "/api/v1/barbers") {
        return Promise.resolve({ data: [{ id: "b1", name: "Carlos Silva" }] });
      }
      if (url === "/api/v1/clients") {
        return Promise.resolve({ data: [{ id: "c1", name: "João Silva", email: "joao@x.com" }] });
      }
      if (url === "/api/v1/appointments/check-availability") {
        const params = config?.params as { date?: string } | undefined;
        const available = params?.date === "2026-08-26";
        return Promise.resolve({ data: available ? { available: true } : { available: false, conflict_with: "10:00 – 10:45" } });
      }
      return Promise.resolve({ data: [] });
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <AppointmentFormModal
          date="2026-08-25"
          initialValues={{
            client_id: "c1",
            client_name: "João Silva",
            service_id: "s1",
            barber_id: "b1",
            appointment_time: "14:00:00",
          }}
          onSubmit={vi.fn()}
          onClose={vi.fn()}
        />
      </QueryClientProvider>
    );

    expect(await screen.findByText("Este barbeiro já tem atendimento das 10:00 – 10:45")).toBeInTheDocument();

    const dateInput = screen.getByLabelText("Dia");
    await userEvent.clear(dateInput);
    await userEvent.type(dateInput, "2026-08-26");

    expect(await screen.findByText("Horário disponível")).toBeInTheDocument();
    expect(screen.queryByText("Este barbeiro já tem atendimento das 10:00 – 10:45")).not.toBeInTheDocument();
  });

  it("excludes its own id from the availability check when editing an existing appointment", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <AppointmentFormModal
          date="2026-08-25"
          initialValues={{
            id: "appt-1",
            client_id: "c1",
            client_name: "João Silva",
            service_id: "s1",
            barber_id: "b1",
            appointment_time: "14:00:00",
          }}
          onSubmit={vi.fn()}
          onClose={vi.fn()}
        />
      </QueryClientProvider>
    );

    await waitFor(() =>
      expect(apiClient.get).toHaveBeenCalledWith("/api/v1/appointments/check-availability", {
        params: {
          barber_id: "b1",
          date: "2026-08-25",
          time: "14:00:00",
          service_id: "s1",
          appointment_id: "appt-1",
        },
      })
    );
  });

  it("shows client suggestions in the same field while typing and selects one on click", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <AppointmentFormModal date="2026-08-25" onSubmit={vi.fn()} onClose={vi.fn()} />
      </QueryClientProvider>
    );

    const clientInput = screen.getByLabelText("Cliente");
    await userEvent.type(clientInput, "João");

    const suggestion = await screen.findByRole("option", { name: "João Silva" });
    await userEvent.click(suggestion);

    expect(clientInput).toHaveValue("João Silva");
    expect(screen.queryByRole("option", { name: "João Silva" })).not.toBeInTheDocument();
  });

  it("clears the selected client if the client field is edited after a selection", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <AppointmentFormModal
          date="2026-08-25"
          initialValues={{
            client_id: "c1",
            client_name: "João Silva",
            service_id: "s1",
            barber_id: "b1",
            appointment_time: "14:00:00",
          }}
          onSubmit={vi.fn()}
          onClose={vi.fn()}
        />
      </QueryClientProvider>
    );

    const clientInput = screen.getByLabelText("Cliente");
    await userEvent.type(clientInput, "x");

    expect(screen.getByRole("button", { name: "Salvar agendamento" })).toBeDisabled();
  });
});
