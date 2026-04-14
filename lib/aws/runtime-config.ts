export interface AwsRuntimeConfig {
  endpoint: string;
  publicEndpoint: string;
  region: string;
  credentials: {
    accessKeyId: string;
    secretAccessKey: string;
  };
}

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

export function getAwsRuntimeConfig(): AwsRuntimeConfig {
  const endpoint = stripTrailingSlash(
    process.env.AWS_ENDPOINT_URL ||
      process.env.LOCALSTACK_ENDPOINT ||
      process.env.NEXT_PUBLIC_LOCALSTACK_ENDPOINT ||
      "http://localhost:4566",
  );

  const publicEndpoint = stripTrailingSlash(
    process.env.NEXT_PUBLIC_LOCALSTACK_ENDPOINT || endpoint,
  );

  const region =
    process.env.AWS_REGION || process.env.NEXT_PUBLIC_AWS_REGION || "us-east-1";

  const accessKeyId =
    process.env.AWS_ACCESS_KEY_ID ||
    process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID ||
    "test";
  const secretAccessKey =
    process.env.AWS_SECRET_ACCESS_KEY ||
    process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY ||
    "test";

  return {
    endpoint,
    publicEndpoint,
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  };
}

export function getHealthRefreshIntervalMs(): number {
  const parsed = Number(process.env.NEXT_PUBLIC_REFRESH_INTERVAL);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return 5000;
  }
  return parsed;
}
