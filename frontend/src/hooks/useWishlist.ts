import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "bk_wishlist";

export function useWishlist() {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setIds(JSON.parse(saved));
    } catch {}
  }, []);

  const toggle = useCallback((id: string) => {
    setIds((prev) => {
      const next = prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id];
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const isWishlisted = useCallback((id: string) => ids.includes(id), [ids]);

  return { ids, toggle, isWishlisted, count: ids.length };
}
