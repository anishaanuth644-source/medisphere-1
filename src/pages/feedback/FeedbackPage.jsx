// src/pages/feedback/FeedbackPage.jsx

import React, { useState, useEffect, useMemo } from "react";
import { Star, Filter } from "lucide-react";
import toast from "react-hot-toast";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../../firebase/config";
import {
  GlassCard, SectionHeader, SearchInput, KPICard, Skeleton,
} from "../../components/ui/index";

async function getFeedback() {
  const snap = await getDocs(query(collection(db, "feedback"), orderBy("createdAt", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

function StarRating({ rating, max = 5, size = 14 }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          size={size}
          className={i < rating ? "text-amber-400 fill-amber-400" : "text-slate-200 dark:text-slate-700"}
        />
      ))}
    </div>
  );
}

const RATING_LABELS = { 5: "Excellent", 4: "Good", 3: "Average", 2: "Poor", 1: "Very poor" };

export function FeedbackPage() {
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [ratingFilter, setRatingFilter] = useState(0); // 0 = all

  useEffect(() => {
    getFeedback()
      .then(setFeedback)
      .catch(() => toast.error("Failed to load feedback"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let rows = feedback;
    if (ratingFilter > 0) rows = rows.filter((f) => f.rating === ratingFilter);
    if (search.trim()) {
      const t = search.toLowerCase();
      rows = rows.filter(
        (f) =>
          f.patientName?.toLowerCase().includes(t) ||
          f.doctorId?.toLowerCase().includes(t) ||
          f.comment?.toLowerCase().includes(t)
      );
    }
    return rows;
  }, [feedback, search, ratingFilter]);

  const avgRating = feedback.length
    ? (feedback.reduce((a, f) => a + (f.rating || 0), 0) / feedback.length).toFixed(1)
    : "—";

  const ratingDist = [5, 4, 3, 2, 1].map((r) => ({
    rating: r,
    count: feedback.filter((f) => f.rating === r).length,
    pct: feedback.length
      ? Math.round((feedback.filter((f) => f.rating === r).length / feedback.length) * 100)
      : 0,
  }));

  return (
    <div className="space-y-5">
      <SectionHeader title="Patient feedback" subtitle="Satisfaction ratings and doctor reviews">
        <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-xl border border-amber-200 dark:border-amber-800">
          <Star size={14} className="text-amber-400 fill-amber-400" />
          <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">{avgRating}</span>
          <span className="text-xs text-amber-600 dark:text-amber-500">avg rating</span>
        </div>
      </SectionHeader>

      {/* Summary row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <KPICard icon={Star} label="Total reviews" value={feedback.length} tone="amber" loading={loading} />
        <KPICard
          icon={Star}
          label="5-star reviews"
          value={feedback.filter((f) => f.rating === 5).length}
          tone="green"
          loading={loading}
        />
        <KPICard
          icon={Star}
          label="Needs attention (≤2★)"
          value={feedback.filter((f) => f.rating <= 2).length}
          tone="red"
          deltaTone="red"
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Rating distribution */}
        <GlassCard>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Rating breakdown</p>
          <div className="space-y-2.5">
            {ratingDist.map(({ rating, count, pct }) => (
              <button
                key={rating}
                onClick={() => setRatingFilter(ratingFilter === rating ? 0 : rating)}
                className={`w-full flex items-center gap-3 rounded-lg p-1.5 transition-colors ${
                  ratingFilter === rating ? "bg-amber-50 dark:bg-amber-900/20" : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                }`}
              >
                <div className="flex items-center gap-1 w-16 shrink-0">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300 w-3">{rating}</span>
                  <Star size={11} className="text-amber-400 fill-amber-400" />
                </div>
                <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-amber-400 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs text-slate-400 w-6 text-right">{count}</span>
              </button>
            ))}
          </div>
          {ratingFilter > 0 && (
            <button
              onClick={() => setRatingFilter(0)}
              className="mt-3 text-xs text-sky-600 hover:underline"
            >
              Clear filter
            </button>
          )}
        </GlassCard>

        {/* Reviews grid */}
        <div className="lg:col-span-2 space-y-4">
          <div className="w-full">
            <SearchInput value={search} onChange={setSearch} placeholder="Search by patient, doctor, or comment…" />
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
            </div>
          ) : filtered.length === 0 ? (
            <GlassCard className="text-center py-10">
              <p className="text-sm text-slate-400">No feedback matches your filter.</p>
            </GlassCard>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filtered.map((f) => (
                <GlassCard key={f.id} className="flex flex-col gap-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                        {f.patientName || "Anonymous"}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {f.createdAt?.toDate?.()?.toLocaleDateString("en-IN") || "—"}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <StarRating rating={f.rating || 0} />
                      <span className="text-[10px] text-slate-400">{RATING_LABELS[f.rating] || ""}</span>
                    </div>
                  </div>
                  {f.comment && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 italic leading-relaxed">
                      "{f.comment}"
                    </p>
                  )}
                  {f.doctorId && (
                    <p className="text-[11px] text-sky-600 dark:text-sky-400 mt-auto">
                      For: {f.doctorId}
                    </p>
                  )}
                </GlassCard>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
