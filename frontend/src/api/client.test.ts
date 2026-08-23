import { describe, it, expect, afterEach } from "vitest";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { apiClient, setAuthToken } from "./client";

const defaultAdapter = apiClient.defaults.adapter;

describe("apiClient 401 refresh retry", () => {
  afterEach(() => {
    apiClient.defaults.adapter = defaultAdapter;
    setAuthToken(null);
  });

  it("refreshes the access token once on 401 and retries the original request", async () => {
    let refreshCalls = 0;
    let protectedCalls = 0;

    apiClient.defaults.adapter = async (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => {
      if (config.url === "/api/v1/auth/refresh") {
        refreshCalls++;
        return { data: { access_token: "new-token" }, status: 200, statusText: "OK", headers: {}, config };
      }
      if (config.url === "/api/v1/protected") {
        protectedCalls++;
        if (config.headers?.Authorization !== "Bearer new-token") {
          return Promise.reject({
            isAxiosError: true,
            config,
            response: { status: 401, data: {}, headers: {}, config },
          });
        }
        return { data: { ok: true }, status: 200, statusText: "OK", headers: {}, config };
      }
      throw new Error(`unexpected url ${config.url}`);
    };

    const response = await apiClient.get("/api/v1/protected");
    expect(response.data).toEqual({ ok: true });
    expect(refreshCalls).toBe(1);
    expect(protectedCalls).toBe(2);
  });

  it("does not retry when the refresh call itself fails, and rejects with the original error", async () => {
    let refreshCalls = 0;

    apiClient.defaults.adapter = async (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => {
      if (config.url === "/api/v1/auth/refresh") {
        refreshCalls++;
        return Promise.reject({
          isAxiosError: true,
          config,
          response: { status: 401, data: {}, headers: {}, config },
        });
      }
      if (config.url === "/api/v1/protected") {
        return Promise.reject({
          isAxiosError: true,
          config,
          response: { status: 401, data: {}, headers: {}, config },
        });
      }
      throw new Error(`unexpected url ${config.url}`);
    };

    await expect(apiClient.get("/api/v1/protected")).rejects.toMatchObject({ response: { status: 401 } });
    expect(refreshCalls).toBe(1);
  });
});
