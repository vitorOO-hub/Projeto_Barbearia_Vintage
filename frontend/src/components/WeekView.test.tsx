import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WeekView } from "./WeekView";
import type { AppointmentDetail } from "../api/appointments";

let originalScrollIntoView: (options?: ScrollIntoViewOptions) => void;

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
  beforeEach(() => {
    originalScrollIntoView = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    if (originalScrollIntoView) {
      Element.prototype.scrollIntoView = originalScrollIntoView;
    }
    vi.useRealTimers();
  });

  it("shows a loading skeleton instead of a blank screen while loading", () => {
    render(<WeekView {...baseProps()} isLoading />);
    expect(screen.getByLabelText("Carregando calendário")).toBeInTheDocument();
  });

  it("shows the empty-state message when there are no appointments in the week", () => {
    render(<WeekView {...baseProps()} />);
    expect(screen.getByText("Nenhum agendamento neste período.")).toBeInTheDocument();
  });

  it("positions a block's top and height proportionally to its start time and duration", () => {
    const appointment = makeAppointment({ appointment_time: "09:00:00", service_duration_minutes: 45 });
    render(<WeekView {...baseProps()} appointments={[appointment]} />);

    const block = screen.getByTestId(`appointment-block-${appointment.id}`);
    expect(block.style.top).toBe("120px");
    expect(block.style.height).toBe("90px");
  });

  it("shows full details for a tall block and only the client name for a tiny sliver", () => {
    const tall = makeAppointment({ id: "tall", service_duration_minutes: 45 });
    const tiny = makeAppointment({ id: "tiny", appointment_date: "2026-08-26", service_duration_minutes: 5 });
    render(<WeekView {...baseProps()} appointments={[tall, tiny]} />);

    const tallBlock = screen.getByTestId("appointment-block-tall");
    expect(tallBlock).toHaveTextContent("João Silva");
    expect(tallBlock).toHaveTextContent("Corte");
    expect(tallBlock).toHaveTextContent("Carlos Silva");

    const tinyBlock = screen.getByTestId("appointment-block-tiny");
    expect(tinyBlock.textContent).toBe("");
    expect(tinyBlock).toHaveAttribute("title", expect.stringContaining("João Silva"));
  });

  it("splits overlapping appointments from different barbers into side-by-side sub-columns", () => {
    const a = makeAppointment({ id: "a1", barber_id: "b1", client_name: "João Silva", appointment_time: "09:00:00", service_duration_minutes: 40 });
    const b = makeAppointment({ id: "a2", barber_id: "b2", client_name: "Maria Costa", appointment_time: "09:20:00", service_duration_minutes: 40 });
    render(<WeekView {...baseProps()} appointments={[a, b]} />);

    expect(screen.getByTestId("appointment-block-a1").style.width).toBe("50%");
    expect(screen.getByTestId("appointment-block-a2").style.width).toBe("50%");
  });

  it("calls onSelectAppointment when an appointment block is clicked", async () => {
    const onSelectAppointment = vi.fn();
    const appointment = makeAppointment({});
    render(<WeekView {...baseProps()} appointments={[appointment]} onSelectAppointment={onSelectAppointment} />);

    await userEvent.click(screen.getByTestId(`appointment-block-${appointment.id}`));
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
    expect(screen.getByText("Ter 25/08")).toHaveClass("bg-gray-900");
  });

  it("scrolls the today column into view when the week is displayed", () => {
    render(<WeekView {...baseProps()} />);
    const mockScrollIntoView = Element.prototype.scrollIntoView as ReturnType<typeof vi.fn>;
    expect(mockScrollIntoView).toHaveBeenCalledWith(expect.objectContaining({ inline: "start" }));
  });

  it("shows the now-line only in today's column when the current time is within the grid range", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 25, 10, 0, 0));
    render(<WeekView {...baseProps()} />);
    expect(screen.getAllByTestId("now-line")).toHaveLength(1);
  });

  it("does not show the now-line when the current time is outside the grid range", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 25, 22, 0, 0));
    render(<WeekView {...baseProps()} />);
    expect(screen.queryByTestId("now-line")).not.toBeInTheDocument();
  });
});
