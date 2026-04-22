"use client";
import { useState, useEffect, useCallback } from "react";

export interface Review {
  _id: string;
  listingId: string;
  reviewer: string;
  reviewee: string;
  rating: number;
  comment: string;
  role: "buyer" | "seller";
  createdAt: string;
}

export interface ReviewSummary {
  reviews: Review[];
  avg: number | null;
  total: number;
}

export function useReviews(address?: string) {
  const [data, setData] = useState<ReviewSummary>({ reviews: [], avg: null, total: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!address) return;
    setLoading(true);
    fetch(`/api/review?address=${address.toLowerCase()}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [address]);

  return { ...data, loading };
}

export function useSubmitReview() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = useCallback(
    async (payload: {
      listingId: string;
      reviewee: string;
      rating: number;
      comment: string;
      role: "buyer" | "seller";
    }) => {
      setSubmitting(true);
      setError("");
      try {
        const res = await fetch("/api/review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error); return false; }
        return true;
      } catch {
        setError("네트워크 오류");
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    []
  );

  return { submit, submitting, error };
}
