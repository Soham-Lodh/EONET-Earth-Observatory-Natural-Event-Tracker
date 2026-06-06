import { useEffect, useState } from "react";
import type { DisasterEvent } from "../types/eonet";
import type { NewsArticle } from "../types/news";

interface Props {
  event: DisasterEvent;
  onClose: () => void;
}

const CATEGORY_CONFIG: Record<string, { color: string; bg: string; border: string; icon: string }> = {
  Wildfires:              { icon: "🔥", color: "#ff7a30", bg: "rgba(255,100,0,0.1)",    border: "rgba(255,100,0,0.25)" },
  "Severe Storms":        { icon: "⛈️", color: "#60a5fa", bg: "rgba(96,165,250,0.1)",   border: "rgba(96,165,250,0.25)" },
  Volcanoes:              { icon: "🌋", color: "#f87171", bg: "rgba(248,113,113,0.1)",  border: "rgba(248,113,113,0.25)" },
  Floods:                 { icon: "🌊", color: "#34d399", bg: "rgba(52,211,153,0.1)",   border: "rgba(52,211,153,0.25)" },
  Earthquakes:            { icon: "📡", color: "#a78bfa", bg: "rgba(167,139,250,0.1)",  border: "rgba(167,139,250,0.25)" },
  "Sea and Lake Ice":     { icon: "🧊", color: "#7dd3fc", bg: "rgba(125,211,252,0.1)", border: "rgba(125,211,252,0.25)" },
  Landslides:             { icon: "⛰️", color: "#d6b17a", bg: "rgba(214,177,122,0.1)", border: "rgba(214,177,122,0.25)" },
  Drought:                { icon: "☀️", color: "#fbbf24", bg: "rgba(251,191,36,0.1)",  border: "rgba(251,191,36,0.25)" },
  "Dust and Haze":        { icon: "🌫️", color: "#9ca3af", bg: "rgba(156,163,175,0.1)", border: "rgba(156,163,175,0.25)" },
  Manmade:                { icon: "🏭", color: "#94a3b8", bg: "rgba(148,163,184,0.1)", border: "rgba(148,163,184,0.25)" },
  Snow:                   { icon: "❄️", color: "#bae6fd", bg: "rgba(186,230,253,0.1)", border: "rgba(186,230,253,0.25)" },
  "Temperature Extremes": { icon: "🌡️", color: "#fb923c", bg: "rgba(251,146,60,0.1)", border: "rgba(251,146,60,0.25)" },
  "Water Color":          { icon: "💧", color: "#38bdf8", bg: "rgba(56,189,248,0.1)",  border: "rgba(56,189,248,0.25)" },
};
const DEFAULT_CFG = { icon: "⚡", color: "#e8e4d9", bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.12)" };

const formatDate = (dateStr: string) => {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch { return "—"; }
};

// Returns 3 queries from specific → broad
const buildFallbackQueries = (event: DisasterEvent): string[] => {
  const title = event.title;
  const category = event.category;

  // Q1: exact title (great for named storms, major fires)
  const q1 = title;

  // Q2: pull the trailing ", City, State/Country" location and combine with category
  // "Bradshaw Wildfire, Powder River, Montana" → "Powder River Montana Wildfire"
  // "KALKASKA-RX 61150021 Fletcher Unit 2 Prescribed Fire, Kalkaska, Michigan" → "Kalkaska Michigan Wildfire"
  const commaChunks = title.split(",").map((s) => s.trim());
  const q2 =
    commaChunks.length >= 3
      ? `${commaChunks[commaChunks.length - 2]} ${commaChunks[commaChunks.length - 1]} ${category}`
      : commaChunks.length === 2
      ? `${commaChunks[1]} ${category}`
      : category;

  // Q3: broadest — just category (always returns something relevant)
  const q3 = category;

  return [q1, q2, q3];
};

const FALLBACK_LABELS = [
  "Exact event",
  "Regional news",
  "Category news",
];

const fetchWithFallback = async (
  queries: string[],
  apiUrl: string,
  apiKey: string,
  onProgress: (query: string, level: number) => void
): Promise<{ articles: NewsArticle[]; level: number }> => {
  for (let i = 0; i < queries.length; i++) {
    onProgress(queries[i], i);
    try {
      const url = `${apiUrl}?q=${encodeURIComponent(queries[i])}&sortBy=relevancy&pageSize=12&language=en&apiKey=${apiKey}`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      const clean = (data.articles || []).filter(
        (a: NewsArticle) => a.title && a.title !== "[Removed]" && a.url
      );
      // Accept if 3+ results, or if this is the last fallback
      if (clean.length >= 3 || i === queries.length - 1) {
        return { articles: clean, level: i };
      }
    } catch {
      continue;
    }
  }
  return { articles: [], level: queries.length - 1 };
};

const NewsModal = ({ event, onClose }: Props) => {
  const apiUrl = import.meta.env.VITE_NEWS_API_URL;
  const apiKey = import.meta.env.VITE_NEWS_API_KEY;

  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeQuery, setActiveQuery] = useState("");
  const [fallbackLevel, setFallbackLevel] = useState(0);

  const cfg = CATEGORY_CONFIG[event.category] || DEFAULT_CFG;

  useEffect(() => {
    const getNews = async () => {
      try {
        setLoading(true);
        setError(null);
        const queries = buildFallbackQueries(event);
        const { articles: found, level } = await fetchWithFallback(
          queries,
          apiUrl,
          apiKey,
          (q, lvl) => { setActiveQuery(q); setFallbackLevel(lvl); }
        );
        setArticles(found);
        setFallbackLevel(level);
      } catch {
        setError("Unable to fetch news. Check your API connection.");
      } finally {
        setLoading(false);
      }
    };
    getNews();
  }, [event.id]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;600;700;800&display=swap');

        .nm-overlay {
          position: fixed; inset: 0; z-index: 999;
          background: rgba(4,6,10,0.85);
          backdrop-filter: blur(12px);
          display: flex; align-items: center; justify-content: center;
          padding: 20px;
          animation: nm-fade-in 0.2s ease both;
        }
        @keyframes nm-fade-in { from { opacity: 0; } to { opacity: 1; } }

        .nm-panel {
          width: 100%; max-width: 1100px; height: 90vh;
          background: #0b0f15;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          display: flex; flex-direction: column; overflow: hidden;
          animation: nm-slide-up 0.3s cubic-bezier(0.16,1,0.3,1) both;
          font-family: 'Syne', sans-serif;
          position: relative;
        }
        .nm-panel::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, var(--nm-accent), transparent);
        }
        @keyframes nm-slide-up {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .nm-header {
          padding: 22px 28px;
          border-bottom: 1px solid rgba(255,255,255,0.07);
          display: flex; align-items: flex-start; gap: 16px; flex-shrink: 0;
        }
        .nm-header-icon {
          width: 44px; height: 44px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-size: 22px; flex-shrink: 0;
        }
        .nm-header-body { flex: 1; min-width: 0; }
        .nm-eyebrow {
          font-family: 'Space Mono', monospace; font-size: 10px;
          text-transform: uppercase; letter-spacing: 0.15em;
          color: rgba(255,255,255,0.35); margin-bottom: 4px;
        }
        .nm-title {
          font-size: 20px; font-weight: 800; color: #f5f0e8;
          line-height: 1.2; letter-spacing: -0.01em;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }

        .nm-query-row {
          display: flex; align-items: center; gap: 8px; margin-top: 8px; flex-wrap: wrap;
        }
        .nm-query-pill {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 3px 10px; border-radius: 100px;
          font-family: 'Space Mono', monospace; font-size: 10px;
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.45); letter-spacing: 0.04em;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 360px;
        }
        .nm-fallback-badge {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 3px 8px; border-radius: 100px;
          font-family: 'Space Mono', monospace; font-size: 9px;
          text-transform: uppercase; letter-spacing: 0.1em; font-weight: 700;
          white-space: nowrap;
        }

        .nm-cat-badge {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 4px 10px; border-radius: 100px;
          font-family: 'Space Mono', monospace; font-size: 10px;
          text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700;
          white-space: nowrap; flex-shrink: 0; align-self: flex-start; margin-top: 4px;
        }
        .nm-close {
          width: 36px; height: 36px; border-radius: 8px;
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.5); font-size: 18px; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.2s; flex-shrink: 0; align-self: flex-start; margin-top: 4px;
          font-family: monospace;
        }
        .nm-close:hover { background: rgba(255,60,60,0.15); border-color: rgba(255,60,60,0.3); color: #f87171; }

        .nm-count-bar {
          padding: 10px 28px; border-bottom: 1px solid rgba(255,255,255,0.05);
          display: flex; align-items: center; gap: 10px; flex-shrink: 0;
        }
        .nm-count-num { font-family: 'Space Mono', monospace; font-size: 13px; font-weight: 700; }
        .nm-count-text {
          font-family: 'Space Mono', monospace; font-size: 10px;
          color: rgba(255,255,255,0.25); text-transform: uppercase; letter-spacing: 0.1em;
        }

        .nm-body {
          flex: 1; overflow-y: auto; padding: 24px 28px;
          scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.08) transparent;
        }
        .nm-body::-webkit-scrollbar { width: 4px; }
        .nm-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }

        .nm-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 16px;
        }

        .nm-card {
          background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.07);
          border-radius: 14px; overflow: hidden;
          display: flex; flex-direction: column;
          transition: border-color 0.25s, transform 0.25s, background 0.25s;
          animation: nm-card-in 0.4s cubic-bezier(0.16,1,0.3,1) both;
        }
        @keyframes nm-card-in {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .nm-card:hover { border-color: rgba(255,255,255,0.13); background: rgba(255,255,255,0.04); transform: translateY(-2px); }

        .nm-card-img { width: 100%; height: 160px; object-fit: cover; display: block; }
        .nm-card-img-placeholder {
          width: 100%; height: 140px;
          background: rgba(255,255,255,0.03);
          display: flex; align-items: center; justify-content: center;
          font-size: 30px; border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .nm-card-body { padding: 16px; display: flex; flex-direction: column; flex: 1; gap: 8px; }
        .nm-card-meta { display: flex; justify-content: space-between; align-items: center; }
        .nm-card-source {
          font-family: 'Space Mono', monospace; font-size: 9px;
          text-transform: uppercase; letter-spacing: 0.12em; color: rgba(255,255,255,0.3);
        }
        .nm-card-date {
          font-family: 'Space Mono', monospace; font-size: 9px;
          color: rgba(255,255,255,0.2); letter-spacing: 0.06em;
        }
        .nm-card-title {
          font-size: 13px; font-weight: 700; color: #e8e4d9;
          line-height: 1.4; flex: 1;
          display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;
        }
        .nm-card-desc {
          font-size: 12px; color: rgba(255,255,255,0.35); line-height: 1.5;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
        }
        .nm-card-btn {
          display: block; width: 100%; padding: 9px; border-radius: 8px;
          background: transparent; border: 1px solid;
          font-family: 'Space Mono', monospace; font-size: 11px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.1em;
          cursor: pointer; transition: all 0.2s; text-align: center; margin-top: 4px;
        }
        .nm-card-btn:hover { opacity: 0.8; }
        .nm-card-btn:active { transform: scale(0.97); }

        .nm-skeleton { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 14px; overflow: hidden; }
        .nm-shimmer {
          background: linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 100%);
          background-size: 200% 100%;
          animation: shimmer 1.8s ease-in-out infinite;
        }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }

        .nm-empty, .nm-error {
          grid-column: 1 / -1; text-align: center; padding: 80px 20px;
        }
        .nm-empty-icon, .nm-error-icon { font-size: 40px; margin-bottom: 12px; }
        .nm-empty-title { font-size: 16px; font-weight: 700; color: rgba(255,255,255,0.5); margin-bottom: 6px; }
        .nm-error-title { font-size: 16px; font-weight: 700; color: #f87171; margin-bottom: 6px; }
        .nm-empty-sub, .nm-error-sub {
          font-family: 'Space Mono', monospace; font-size: 11px; color: rgba(255,255,255,0.2);
          line-height: 1.6;
        }

        @media (max-width: 600px) {
          .nm-panel { border-radius: 16px; }
          .nm-header, .nm-body, .nm-count-bar { padding-left: 18px; padding-right: 18px; }
          .nm-grid { grid-template-columns: 1fr; }
          .nm-title { font-size: 16px; }
        }
      `}</style>

      <div className="nm-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="nm-panel" style={{ "--nm-accent": cfg.color } as React.CSSProperties}>

          {/* ── Header ── */}
          <div className="nm-header">
            <div className="nm-header-icon" style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
              {cfg.icon}
            </div>

            <div className="nm-header-body">
              <div className="nm-eyebrow">News Coverage</div>
              <div className="nm-title">{event.title}</div>

              <div className="nm-query-row">
                {activeQuery && (
                  <span className="nm-query-pill">
                    🔍 {activeQuery}
                  </span>
                )}
                {!loading && (
                  <span
                    className="nm-fallback-badge"
                    style={
                      fallbackLevel === 0
                        ? { background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.25)", color: "#4ade80" }
                        : fallbackLevel === 1
                        ? { background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.25)", color: "#fbbf24" }
                        : { background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)", color: "#f87171" }
                    }
                  >
                    {fallbackLevel === 0 ? "●" : fallbackLevel === 1 ? "◐" : "○"} {FALLBACK_LABELS[fallbackLevel]}
                  </span>
                )}
              </div>
            </div>

            <span className="nm-cat-badge" style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}>
              {cfg.icon} {event.category}
            </span>

            <button className="nm-close" onClick={onClose} aria-label="Close">✕</button>
          </div>

          {/* ── Count bar ── */}
          {!loading && !error && (
            <div className="nm-count-bar">
              <span className="nm-count-num" style={{ color: cfg.color }}>{articles.length}</span>
              <span className="nm-count-text">Articles Found</span>
              {fallbackLevel > 0 && (
                <span className="nm-count-text" style={{ marginLeft: "auto" }}>
                  {fallbackLevel === 1
                    ? "No exact match — showing regional news"
                    : "No regional match — showing category news"}
                </span>
              )}
            </div>
          )}

          {/* ── Body ── */}
          <div className="nm-body">
            <div className="nm-grid">

              {loading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="nm-skeleton" style={{ animationDelay: `${i * 60}ms` }}>
                    <div className="nm-shimmer" style={{ height: 160 }} />
                    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                      <div className="nm-shimmer" style={{ height: 10, width: "40%", borderRadius: 4 }} />
                      <div className="nm-shimmer" style={{ height: 14, borderRadius: 4 }} />
                      <div className="nm-shimmer" style={{ height: 14, width: "75%", borderRadius: 4 }} />
                      <div className="nm-shimmer" style={{ height: 38, borderRadius: 8, marginTop: 8 }} />
                    </div>
                  </div>
                ))}

              {error && (
                <div className="nm-error">
                  <div className="nm-error-icon">📡</div>
                  <div className="nm-error-title">Signal Lost</div>
                  <div className="nm-error-sub">{error}</div>
                </div>
              )}

              {!loading && !error && articles.length === 0 && (
                <div className="nm-empty">
                  <div className="nm-empty-icon">🔍</div>
                  <div className="nm-empty-title">No articles found</div>
                  <div className="nm-empty-sub">
                    This event is too localised to have news coverage.<br />
                    Try checking local Montana / Michigan news sources directly.
                  </div>
                </div>
              )}

              {!loading &&
                articles.map((article, i) => (
                  <div key={i} className="nm-card" style={{ animationDelay: `${i * 50}ms` }}>
                    {article.urlToImage ? (
                      <img
                        src={article.urlToImage}
                        alt={article.title}
                        className="nm-card-img"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    ) : (
                      <div className="nm-card-img-placeholder">{cfg.icon}</div>
                    )}

                    <div className="nm-card-body">
                      <div className="nm-card-meta">
                        <span className="nm-card-source">{article.source?.name || "Unknown"}</span>
                        <span className="nm-card-date">{formatDate(article.publishedAt)}</span>
                      </div>
                      <p className="nm-card-title">{article.title}</p>
                      {article.description && (
                        <p className="nm-card-desc">{article.description}</p>
                      )}
                      <button
                        className="nm-card-btn"
                        style={{ color: cfg.color, borderColor: cfg.border }}
                        onClick={() => window.open(article.url, "_blank", "noopener,noreferrer")}
                      >
                        Read Article →
                      </button>
                    </div>
                  </div>
                ))}

            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default NewsModal;