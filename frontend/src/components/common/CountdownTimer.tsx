"use client";
import { useEffect, useState } from "react";
import { secondsUntil, formatDuration } from "@/lib/utils";

export default function CountdownTimer({ endTime }: { endTime: bigint }) {
  const [remaining, setRemaining] = useState(secondsUntil(endTime));

  useEffect(() => {
    const id = setInterval(() => setRemaining(secondsUntil(endTime)), 1000);
    return () => clearInterval(id);
  }, [endTime]);

  return (
    <span className={remaining <= 0 ? "text-red-500" : "text-green-600"}>
      {formatDuration(remaining)}
    </span>
  );
}
