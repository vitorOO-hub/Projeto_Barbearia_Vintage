import { describe, expect, it } from "vitest";
import { AxiosError } from "axios";
import { translateApiError } from "./errors";

describe("translateApiError", () => {
  it("translates a 401 with backend detail to that detail message", () => {
    const error = new AxiosError("Unauthorized", "401", undefined, undefined, {
      status: 401,
      data: { detail: "E-mail ou senha inválidos." },
    } as any);
    expect(translateApiError(error)).toBe("E-mail ou senha inválidos.");
  });

  it("translates a 409 conflict detail message", () => {
    const error = new AxiosError("Conflict", "409", undefined, undefined, {
      status: 409,
      data: { detail: "Já existe um agendamento para este horário." },
    } as any);
    expect(translateApiError(error)).toBe("Já existe um agendamento para este horário.");
  });

  it("translates a network error (no response) to a friendly message", () => {
    const error = new AxiosError("Network Error");
    expect(translateApiError(error)).toBe(
      "Não conseguimos conectar. Verifique sua internet e tente de novo."
    );
  });

  it("translates an unexpected 500 to a generic friendly message", () => {
    const error = new AxiosError("Server Error", "500", undefined, undefined, {
      status: 500,
      data: {},
    } as any);
    expect(translateApiError(error)).toBe("Algo deu errado. Tente novamente em instantes.");
  });

  it("falls back to the generic message for a non-Axios error", () => {
    expect(translateApiError(new Error("whatever"))).toBe(
      "Algo deu errado. Tente novamente em instantes."
    );
  });
});
