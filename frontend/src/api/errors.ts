import axios from "axios";

const GENERIC_ERROR = "Algo deu errado. Tente novamente em instantes.";
const NETWORK_ERROR = "Não conseguimos conectar. Verifique sua internet e tente de novo.";

export function translateApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return NETWORK_ERROR;
    }
    const detail = (error.response.data as { detail?: string } | undefined)?.detail;
    if (detail && error.response.status < 500) {
      return detail;
    }
    return GENERIC_ERROR;
  }
  return GENERIC_ERROR;
}
