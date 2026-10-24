import { useEffect, useState } from "react";
import { api, ApiError, errorMessage, money } from "../api";
import type { Quote } from "./types";

export function useData<T>(path: string, token: string, refresh = 0) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setData(null);
    api<T>(path, token, { signal: controller.signal })
      .then(setData)
      .catch((e) => {
        if (!controller.signal.aborted) setError(errorMessage(e));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [path, token, refresh]);
  return { data, error, loading };
}

export function Feedback({
  loading,
  error,
}: {
  loading?: boolean;
  error?: string;
}) {
  return (
    <>
      {loading && (
        <p className="page-loading" role="status">
          Getting things ready…
        </p>
      )}
      {error && (
        <div className="alert error" role="alert">
          {error}
        </div>
      )}
    </>
  );
}

export function PriceBreakdown({ quote }: { quote: Quote }) {
  return (
    <div className="price-breakdown">
      <div>
        <span>Car · ex-showroom</span>
        <strong>{money(quote.vehicle_price)}</strong>
      </div>
      <div>
        <span>Registration estimate</span>
        <strong>{money(quote.registration_estimate)}</strong>
      </div>
      <div>
        <span>Insurance estimate</span>
        <strong>{money(quote.insurance_estimate)}</strong>
      </div>
      {quote.accessories.map((item) => (
        <div key={item.id}>
          <span>{item.name} · estimate</span>
          <strong>{money(item.price)}</strong>
        </div>
      ))}
      <div className="breakdown-total">
        <span>Total estimate</span>
        <strong>{money(quote.total)}</strong>
      </div>
    </div>
  );
}

export async function downloadInvoice(reference: string, token: string) {
  const response = await fetch(
    `/api/orders/${encodeURIComponent(reference)}/invoice`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!response.ok)
    throw new ApiError(
      response.status,
      "Invoice unavailable. Please sign in again or retry.",
    );
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `invoice-${reference}.html`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
