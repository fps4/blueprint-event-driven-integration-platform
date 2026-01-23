export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface HttpRequest {
  method: HttpMethod;
  url: string;
  headers?: Record<string, string>;
  body?: string | Buffer;
  timeoutMs?: number;
}

export interface HttpResponse<T = unknown> {
  status: number;
  headers: Record<string, string | string[]>;
  data: T;
}

export interface RetryPolicy {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryOnStatuses: number[];
}

export interface CircuitBreakerPolicy {
  failureThreshold: number;
  resetTimeoutMs: number;
}

export interface HttpClient {
  request<T = unknown>(request: HttpRequest): Promise<HttpResponse<T>>;
}

export interface TelemetryHooks {
  onRequestStart?: (request: HttpRequest) => void;
  onRequestSuccess?: (request: HttpRequest, response: HttpResponse) => void;
  onRequestError?: (request: HttpRequest, error: Error) => void;
}

export const defaultRetryPolicy: RetryPolicy = {
  maxAttempts: 3,
  baseDelayMs: 250,
  maxDelayMs: 2_000,
  retryOnStatuses: [408, 429, 500, 502, 503, 504]
};

export class InvalidTopicNameError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidTopicNameError";
  }
}

const topicPattern = /^[A-Za-z0-9._-]{1,249}$/;

// Basic Kafka-compatible topic validation used by source/sink connectors.
export function validateTopicName(topic: unknown): string {
  if (typeof topic !== "string") {
    throw new InvalidTopicNameError("topic must be a string");
  }

  const normalized = topic.trim();

  if (!normalized) {
    throw new InvalidTopicNameError("topic is required");
  }

  if (normalized === "." || normalized === "..") {
    throw new InvalidTopicNameError("topic cannot be '.' or '..'");
  }

  if (!topicPattern.test(normalized)) {
    throw new InvalidTopicNameError(
      "topic may only include letters, numbers, '.', '_' or '-' and be at most 249 characters"
    );
  }

  return normalized;
}
