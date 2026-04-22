import { useState, useEffect } from "react";

/** 여러 listing의 조회수를 한 번에 조회 */
export function useViewCounts(listingIds: string[]) {
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!listingIds.length) return;
    const ids = listingIds.join(",");
    fetch(`/api/views?listingIds=${ids}`)
      .then((r) => r.json())
      .then(setCounts)
      .catch(() => {});
  }, [listingIds.join(",")]);

  return counts;
}

/** 상품 상세 진입 시 조회수 1 증가 (세션당 1회) */
export function useIncrementView(listingId: string) {
  useEffect(() => {
    if (!listingId) return;
    const key = `bk_viewed_${listingId}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1"); // fetch 전 즉시 세팅 (StrictMode 이중 실행 방지)
    fetch("/api/views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId }),
    }).catch(() => {});
  }, [listingId]);
}

/** 단일 listing 조회수 조회 */
export function useViewCount(listingId: string) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (!listingId) return;
    fetch(`/api/views?listingIds=${listingId}`)
      .then((r) => r.json())
      .then((data) => setCount(data[listingId] ?? 0))
      .catch(() => {});
  }, [listingId]);

  return count;
}
