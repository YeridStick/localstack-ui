import { getAwsRuntimeConfig } from "./runtime-config";

export interface EmulatorHealthCheck {
  isReachable: boolean;
  backend: "ministack" | "localstack" | "unknown";
  endpoint: string;
  healthPath: string | null;
  details?: unknown;
}

const HEALTH_PATHS = ["/_ministack/health", "/_localstack/health"];
const HEALTH_REQUEST_TIMEOUT_MS = 2_500;

export async function checkAwsEmulatorHealth(): Promise<EmulatorHealthCheck> {
  const { endpoint } = getAwsRuntimeConfig();

  for (const healthPath of HEALTH_PATHS) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), HEALTH_REQUEST_TIMEOUT_MS);
      let response: Response;
      try {
        response = await fetch(`${endpoint}${healthPath}`, {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }

      if (!response.ok) {
        continue;
      }

      const text = await response.text();
      let details: unknown = text;
      try {
        details = JSON.parse(text);
      } catch {
        // Keep raw text when response is not JSON.
      }

      return {
        isReachable: true,
        backend:
          healthPath === "/_ministack/health" ? "ministack" : "localstack",
        endpoint,
        healthPath,
        details,
      };
    } catch {
      // Keep trying with the next known health path.
    }
  }

  return {
    isReachable: false,
    backend: "unknown",
    endpoint,
    healthPath: null,
  };
}
