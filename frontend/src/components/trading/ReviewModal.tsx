"use client";

import { useState } from "react";
import { useSubmitReview } from "@/hooks/useReview";

interface Props {
  listingId: string;
  reviewee: string;
  role: "buyer" | "seller";
  onClose: () => void;
  onDone?: () => void;
}

export default function ReviewModal({ listingId, reviewee, role, onClose, onDone }: Props) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [done, setDone] = useState(false);
  const { submit, submitting, error } = useSubmitReview();

  const handleSubmit = async () => {
    if (!rating) return;
    const ok = await submit({ listingId, reviewee, rating, comment, role });
    if (ok) {
      setDone(true);
      onDone?.();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 z-10">
        {done ? (
          <div className="text-center py-4">
            <div className="text-4xl mb-3">✅</div>
            <p className="font-semibold text-gray-900">리뷰가 등록되었어요.</p>
            <p className="text-xs text-gray-400 mt-1">소중한 후기 감사합니다.</p>
            <button onClick={onClose} className="btn-primary text-sm mt-5 w-full">
              닫기
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900">{role === "buyer" ? "판매자" : "구매자"} 리뷰 작성</h2>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex justify-center gap-2 mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onMouseEnter={() => setHover(star)}
                  onMouseLeave={() => setHover(0)}
                  onClick={() => setRating(star)}
                  className="text-3xl transition-transform hover:scale-110"
                >
                  <span className={(hover || rating) >= star ? "text-amber-400" : "text-gray-200"}>★</span>
                </button>
              ))}
            </div>

            {rating > 0 && (
              <p className="text-center text-xs text-gray-400 mb-3">
                {["", "별로예요", "아쉬워요", "보통이에요", "좋아요", "최고예요"][rating]}
              </p>
            )}

            <textarea
              className="input-base resize-none text-sm"
              rows={3}
              placeholder="거래 후기를 남겨 주세요. (선택)"
              maxLength={200}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <p className="text-right text-xs text-gray-400 mt-1">{comment.length}/200</p>

            {error && <p className="text-xs text-red-500 mt-2">{error}</p>}

            <div className="flex gap-2 mt-4">
              <button onClick={onClose} className="btn-secondary flex-1 text-sm">
                나중에
              </button>
              <button onClick={handleSubmit} disabled={!rating || submitting} className="btn-primary flex-1 text-sm disabled:opacity-40">
                {submitting ? "등록 중..." : "리뷰 등록"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
