import type { DisasterEvent } from "../types/eonet";

interface Props {
  event: DisasterEvent & { status?: "active" | "stale" | "closed" };
  onViewMap: () => void;
  index?: number;
}

const CATEGORY_CONFIG: Record<string, { color: string; bg: string; border: string; icon: string }> = {
  "Wildfires":            { icon: "🔥", color: "#ff7a30", bg: "rgba(255,100,0,0.1)",    border: "rgba(255,100,0,0.25)"   },
  "Severe Storms":        { icon: "⛈️", color: "#60a5fa", bg: "rgba(96,165,250,0.1)",   border: "rgba(96,165,250,0.25)"  },
  "Volcanoes":            { icon: "🌋", color: "#f87171", bg: "rgba(248,113,113,0.1)",  border: "rgba(248,113,113,0.25)" },
  "Floods":               { icon: "🌊", color: "#34d399", bg: "rgba(52,211,153,0.1)",   border: "rgba(52,211,153,0.25)"  },
  "Earthquakes":          { icon: "📡", color: "#a78bfa", bg: "rgba(167,139,250,0.1)",  border: "rgba(167,139,250,0.25)" },
  "Sea and Lake Ice":     { icon: "🧊", color: "#7dd3fc", bg: "rgba(125,211,252,0.1)",  border: "rgba(125,211,252,0.25)" },
  "Landslides":           { icon: "⛰️", color: "#d6b17a", bg: "rgba(214,177,122,0.1)",  border: "rgba(214,177,122,0.25)" },
  "Drought":              { icon: "☀️", color: "#fbbf24", bg: "rgba(251,191,36,0.1)",   border: "rgba(251,191,36,0.25)"  },
  "Dust and Haze":        { icon: "🌫️", color: "#9ca3af", bg: "rgba(156,163,175,0.1)",  border: "rgba(156,163,175,0.25)" },
  "Manmade":              { icon: "🏭", color: "#94a3b8", bg: "rgba(148,163,184,0.1)",  border: "rgba(148,163,184,0.25)" },
  "Snow":                 { icon: "❄️", color: "#bae6fd", bg: "rgba(186,230,253,0.1)",  border: "rgba(186,230,253,0.25)" },
  "Temperature Extremes": { icon: "🌡️", color: "#fb923c", bg: "rgba(251,146,60,0.1)",   border: "rgba(251,146,60,0.25)"  },
  "Water Color":          { icon: "💧", color: "#38bdf8", bg: "rgba(56,189,248,0.1)",   border: "rgba(56,189,248,0.25)"  },
};

const DEFAULT_CONFIG = { icon: "⚡", color: "#e8e4d9", bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.12)" };

const STATUS_CONFIG = {
  active: { label: "Active",  color: "#4ade80", bg: "rgba(74,222,128,0.08)",   border: "rgba(74,222,128,0.25)",    pulse: true  },
  stale:  { label: "Stale",   color: "#fbbf24", bg: "rgba(251,191,36,0.08)",   border: "rgba(251,191,36,0.25)",    pulse: false },
  closed: { label: "Closed",  color: "rgba(255,255,255,0.3)", bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.1)", pulse: false },
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
  } catch { return "—"; }
};

const DisasterCard = ({ event, onViewMap, index = 0 }: Props) => {
  const cfg = CATEGORY_CONFIG[event.category] || DEFAULT_CONFIG;
  const status = (event as any).status ?? (event.closed ? "closed" : "active");
  const sCfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
  const delay = `${index * 60}ms`;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;600;700;800&display=swap');

        .disaster-card {
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px;
          padding: 22px;
          transition: border-color 0.3s ease, background 0.3s ease, transform 0.3s ease, box-shadow 0.3s ease;
          animation: cardEntrance 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
          position: relative;
          overflow: hidden;
          font-family: 'Syne', sans-serif;
        }

        .disaster-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, var(--card-accent, #ff7a30), transparent);
          opacity: 0;
          transition: opacity 0.3s;
        }

        .disaster-card:hover {
          border-color: rgba(255,255,255,0.14);
          background: rgba(255,255,255,0.04);
          transform: translateY(-3px);
          box-shadow: 0 16px 40px rgba(0,0,0,0.4);
        }

        .disaster-card:hover::before { opacity: 1; }

        @keyframes cardEntrance {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .card-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 14px;
          gap: 10px;
        }

        .category-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 10px;
          border-radius: 100px;
          font-family: 'Space Mono', monospace;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-weight: 700;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 10px;
          border-radius: 100px;
          font-family: 'Space Mono', monospace;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-weight: 700;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .status-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
        }

        .pulse-dot {
          animation: statusPulse 2s ease-in-out infinite;
        }

        @keyframes statusPulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 currentColor; }
          50% { opacity: 0.5; }
        }

        .card-title {
          font-size: 16px;
          font-weight: 700;
          color: #f5f0e8;
          line-height: 1.3;
          margin-bottom: 16px;
          letter-spacing: -0.01em;
        }

        .card-stats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 18px;
        }

        .stat-block {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 10px;
          padding: 10px 12px;
        }

        .stat-block.full { grid-column: 1 / -1; }

        .stat-label {
          font-family: 'Space Mono', monospace;
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: rgba(255,255,255,0.3);
          margin-bottom: 4px;
        }

        .stat-value {
          font-family: 'Space Mono', monospace;
          font-size: 13px;
          font-weight: 700;
          color: #e8e4d9;
          line-height: 1.2;
        }

        .track-bar-wrap { margin-bottom: 18px; }

        .track-bar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }

        .track-label {
          font-family: 'Space Mono', monospace;
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: rgba(255,255,255,0.3);
        }

        .track-count {
          font-family: 'Space Mono', monospace;
          font-size: 12px;
          font-weight: 700;
        }

        .track-bar {
          height: 3px;
          background: rgba(255,255,255,0.06);
          border-radius: 2px;
          overflow: hidden;
        }

        .track-bar-fill {
          height: 100%;
          border-radius: 2px;
          transition: width 1.2s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .card-id {
          font-family: 'Space Mono', monospace;
          font-size: 10px;
          color: rgba(255,255,255,0.2);
          letter-spacing: 0.06em;
        }

        .view-map-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 9px 18px;
          border-radius: 8px;
          border: 1px solid;
          font-family: 'Space Mono', monospace;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          cursor: pointer;
          transition: all 0.2s;
          background: transparent;
          position: relative;
          overflow: hidden;
        }

        .view-map-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: currentColor;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .view-map-btn:hover::before { opacity: 0.08; }
        .view-map-btn:active { transform: scale(0.97); }

        .btn-arrow { transition: transform 0.2s; }
        .view-map-btn:hover .btn-arrow { transform: translateX(3px); }
      `}</style>

      <div
        className="disaster-card"
        style={{
          animationDelay: delay,
          // @ts-ignore
          "--card-accent": cfg.color,
        }}
      >
        <div className="card-top">
          <span
            className="category-badge"
            style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}
          >
            {cfg.icon} {event.category}
          </span>

          <span
            className="status-badge"
            style={{ background: sCfg.bg, border: `1px solid ${sCfg.border}`, color: sCfg.color }}
          >
            <span
              className={`status-dot ${sCfg.pulse ? "pulse-dot" : ""}`}
              style={{ background: sCfg.color, boxShadow: sCfg.pulse ? `0 0 6px ${sCfg.color}` : "none" }}
            />
            {sCfg.label}
          </span>
        </div>

        <h2 className="card-title">{event.title}</h2>

        <div className="card-stats">
          <div className="stat-block">
            <div className="stat-label">Start Date</div>
            <div className="stat-value">{formatDate(event.startDate)}</div>
          </div>
          <div className="stat-block">
            <div className="stat-label">Last Update</div>
            <div className="stat-value">{formatDate(event.endDate)}</div>
          </div>
          {event.magnitudeValue > 0 && (
            <div className="stat-block full">
              <div className="stat-label">Peak Magnitude</div>
              <div className="stat-value" style={{ color: cfg.color }}>
                {event.magnitudeValue} {event.magnitudeUnit}
              </div>
            </div>
          )}
        </div>

        <div className="track-bar-wrap">
          <div className="track-bar-header">
            <span className="track-label">Track Points</span>
            <span className="track-count" style={{ color: cfg.color }}>{event.points.length}</span>
          </div>
          <div className="track-bar">
            <div
              className="track-bar-fill"
              style={{
                width: `${Math.min(100, (event.points.length / 50) * 100)}%`,
                background: cfg.color,
              }}
            />
          </div>
        </div>

        <div className="card-footer">
          <span className="card-id">#{event.id.slice(-8).toUpperCase()}</span>
          <button
            onClick={onViewMap}
            className="view-map-btn"
            style={{ color: cfg.color, borderColor: cfg.border }}
          >
            View on Map
            <span className="btn-arrow">→</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default DisasterCard;