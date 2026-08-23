import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WeekView } from "./WeekView";
import type { AppointmentDetail } from "../api/appointments";

function makeAppointment(overrides: Partial<AppointmentDetail>): AppointmentDetail {
  return {
    id: "a1",
    client_id: "c1",
    service_id: "s1",
    barber_id: "b1",
    appointment_date: "2026-08-25",
    appointment_time: "14:00:00",
    status: "agendado",
    client_name: "João Silva",
    client_email: null,
    service_name: "Corte",
    service_price: 40,
    service_duration_minutes: 30,
    barber_name: "Carlos Silva",
    ...overrides,
  };
}

const weekStart = new Date(2026, 7, 23); // Sunday
const today = new Date(2026, 7, 25); // Tuesday, inside this week

function baseProps() {
  return {
    weekStart,
    appointments: [] as AppointmentDetail[],
    isLoading: false,
    today,
    onPrevWeek: vi.fn(),
    onNextWeek: vi.fn(),
    onSelectAppointment: vi.fn(),
  };
}

describe("WeekView", () => {
  it("shows a loading skeleton instead of a blank screen while loading", () => {
    render(<WeekView {...baseProps()} isLoading />);
    expect(screen.getByLabelText("Carregando calendário")).toBeInTheDocument();
  });

  it("shows the empty-state message when there are no appointments in the week", () => {
    render(<WeekView {...baseProps()} />);
    expect(screen.getByText("Nenhum agendamento neste período.")).toBeInTheDocument();
  });

  it("stacks appointments from two different barbers in the same day and time slot", () => {
    const appointments = [
      makeAppointment({ id: "a1", barber_id: "b1", barber_name: "Carlos Silva", client_name: "João Silva" }),
      makeAppointment({ id: "a2", barber_id: "b2", barber_name: "Marcos Souza", client_name: "Maria Costa" }),
    ];
    render(<WeekView {...baseProps()} appointments={appointments} />);
    expect(screen.getByText("João Silva")).toBeInTheDocument();
    expect(screen.getByText("Maria Costa")).toBeInTheDocument();
  });

  it("calls onSelectAppointment when an appointment block is clicked", async () => {
    const onSelectAppointment = vi.fn();
    const appointment = makeAppointment({});
    render(<WeekView {...baseProps()} appointments={[appointment]} onSelectAppointment={onSelectAppointment} />);

    await userEvent.click(screen.getByText("João Silva"));
    expect(onSelectAppointment).toHaveBeenCalledWith(appointment);
  });

  it("calls onPrevWeek and onNextWeek when navigation buttons are clicked", async () => {
    const onPrevWeek = vi.fn();
    const onNextWeek = vi.fn();
    render(<WeekView {...baseProps()} onPrevWeek={onPrevWeek} onNextWeek={onNextWeek} />);

    await userEvent.click(screen.getByRole("button", { name: /Anterior/ }));
    await userEvent.click(screen.getByRole("button", { name: /Próxima/ }));
    expect(onPrevWeek).toHaveBeenCalledTimes(1);
    expect(onNextWeek).toHaveBeenCalledTimes(1);
  });

  it("highlights the column for today", () => {
    render(<WeekView {...baseProps()} />);
    expect(screen.getByText("Ter 25")).toHaveClass("bg-gray-900");
  });
});
