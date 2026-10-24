export type User = { id: number; email: string; role: "customer" | "admin" };
export type Vehicle = {
  id: number;
  make: string;
  model: string;
  category: string;
  price: string;
  quantity: number;
};
export type VehiclePage = { items: Vehicle[]; total: number };
export type LoginResult = { access_token: string; user: User };

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function api<T>(
  path: string,
  token: string | null,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (response.status === 204) return undefined as T;
  const body = await response.json();
  if (!response.ok) {
    const detail = body.detail;
    const message = Array.isArray(detail)
      ? detail
          .map(
            (item: { loc: string[]; msg: string }) =>
              `${item.loc.at(-1)}: ${item.msg}`,
          )
          .join(". ")
      : detail;
    throw new ApiError(
      response.status,
      message || "Something went wrong. Please try again.",
    );
  }
  return body;
}

export function errorMessage(error: unknown) {
  return error instanceof ApiError
    ? error.message
    : "Could not connect to the server. Please try again.";
}

export const currency = import.meta.env.VITE_CURRENCY || "USD";
export const money = (value: number | string) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value));
