import { useEffect, useState } from "react";
import DisasterCard from "../components/DisasterCard";
import EventMapModal from "../components/EventMapModal";
import type { DisasterEvent } from "../types/eonet";

const CATEGORY_ICONS: Record<string, string> = {
  "Wildfires": "🔥",
  "Severe Storms": "⛈️",
  "Volcanoes": "🌋",
  "Floods": "🌊",
  "Earthquakes": "📡",
  "Sea and Lake Ice": "🧊",
  "Landslides": "⛰️",
  "Drought": "☀️",
  "Dust and Haze": "🌫️",
  "Manmade": "🏭",
  "Snow": "❄️",
  "Temperature Extremes": "🌡️",
  "Water Color": "💧",
};
const STALE_DAYS = 7;

const deriveStatus = (event: { closed: string | null; endDate: string }): "active" | "closed" | "stale" => {
  if (event.closed) return "closed";
  const last = new Date(event.endDate).getTime();
  const now = Date.now();
  const daysSince = (now - last) / (1000 * 60 * 60 * 24);
  if (daysSince > STALE_DAYS) return "stale";
  return "active";
};

const SkeletonCard = () => (
  <div className="skeleton-card">
    <div className="skeleton-header">
      <div className="skeleton-badge shimmer" />
      <div className="skeleton-status shimmer" />
    </div>
    <div className="skeleton-title shimmer" />
    <div className="skeleton-title shimmer" style={{ width: "60%" }} />
    <div className="skeleton-grid">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="skeleton-stat shimmer" />
      ))}
    </div>
    <div className="skeleton-button shimmer" />
  </div>
);

const Home = () => {
  const api = import.meta.env.VITE_API;
  const [events, setEvents] = useState<DisasterEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<DisasterEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("All");

  const groupEvents = (features: any[]): DisasterEvent[] => {
    const grouped: Record<string, any> = {};

    features.forEach((feature) => {
      const props = feature.properties;
      const id = props.id;

      if (!grouped[id]) {
        grouped[id] = {
          id,
          title: props.title,
          description: props.description,
          category: props.categories?.[0]?.title || "Unknown",
          magnitudeUnit: props.magnitudeUnit || "",
          closed: props.closed,
          points: [],
        };
      }

      grouped[id].points.push({
        date: props.date,
        coordinates: feature.geometry.coordinates,
        magnitudeValue: props.magnitudeValue || 0,
      });
    });

    return Object.values(grouped).map((event: any) => ({
      ...event,
      startDate: event.points[0]?.date,
      endDate: event.points[event.points.length - 1]?.date,
      magnitudeValue: Math.max(...event.points.map((p: any) => p.magnitudeValue)),
      // Attach derived status so cards + modal can use it
      status: deriveStatus({
        closed: event.closed,
        endDate: event.points[event.points.length - 1]?.date,
      }),
    }));
  };

  const getData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${api}/events/geojson?limit=500`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const grouped = groupEvents(data.features);
      setEvents(grouped);
    } catch (err) {
      setError("Failed to fetch disaster events. Check your API connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { getData(); }, []);

  const categories = ["All", ...Array.from(new Set(events.map(e => e.category)))];
  const filtered = filter === "All" ? events : events.filter(e => e.category === filter);

  const activeCount = events.filter(e => (e as any).status === "active").length;
  const staleCount  = events.filter(e => (e as any).status === "stale").length;
  const closedCount = events.filter(e => (e as any).status === "closed").length;

  return (
    <div className="home-container">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400&family=Syne:wght@400;600;700;800&display=swap');

        * { box-sizing: border-box; }

        body, #root {
          background: #080c10;
          min-height: 100vh;
        }

        .home-container {
          min-height: 100vh;
          background: #080c10;
          background-image:
            radial-gradient(ellipse 80% 50% at 50% -10%, rgba(255,100,0,0.08) 0%, transparent 60%),
            repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(255,255,255,0.015) 39px, rgba(255,255,255,0.015) 40px),
            repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(255,255,255,0.015) 39px, rgba(255,255,255,0.015) 40px);
          font-family: 'Syne', sans-serif;
          color: #e8e4d9;
          padding-bottom: 80px;
        }

        .hud-header {
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(8, 12, 16, 0.92);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255, 100, 30, 0.15);
          padding: 0 32px;
        }

        .hud-header-inner {
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 64px;
          gap: 24px;
        }

        .hud-logo { display: flex; align-items: center; gap: 12px; }

        .hud-logo-icon {
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, #ff6400, #ff3a00);
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          flex-shrink: 0;
          box-shadow: 0 0 20px rgba(255, 100, 0, 0.4);
        }

        .hud-logo-text {
          font-family: 'Space Mono', monospace;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.12em;
          color: #ff7a30;
          text-transform: uppercase;
        }

        .hud-logo-sub {
          font-family: 'Space Mono', monospace;
          font-size: 10px;
          color: rgba(255,255,255,0.3);
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .hud-stats { display: flex; align-items: center; gap: 24px; }

        .hud-stat { text-align: center; }

        .hud-stat-value {
          font-family: 'Space Mono', monospace;
          font-size: 20px;
          font-weight: 700;
          color: #ff7a30;
          line-height: 1;
        }

        .hud-stat-label {
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: rgba(255,255,255,0.3);
          margin-top: 2px;
          font-family: 'Space Mono', monospace;
        }

        .hud-divider { width: 1px; height: 32px; background: rgba(255,255,255,0.08); }

        .live-indicator {
          display: flex;
          align-items: center;
          gap: 6px;
          font-family: 'Space Mono', monospace;
          font-size: 10px;
          color: #4ade80;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .live-dot {
          width: 6px;
          height: 6px;
          background: #4ade80;
          border-radius: 50%;
          animation: pulse-green 2s ease-in-out infinite;
          box-shadow: 0 0 8px #4ade80;
        }

        @keyframes pulse-green {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }

        .main-content {
          max-width: 1400px;
          margin: 0 auto;
          padding: 40px 32px 0;
        }

        .section-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 20px;
        }

        .section-eyebrow {
          font-family: 'Space Mono', monospace;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.2em;
          color: #ff7a30;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .section-eyebrow::before {
          content: '';
          width: 20px;
          height: 1px;
          background: #ff7a30;
        }

        .section-title {
          font-size: 36px;
          font-weight: 800;
          color: #f5f0e8;
          line-height: 1.1;
          letter-spacing: -0.02em;
        }

        .filter-bar { display: flex; gap: 8px; flex-wrap: wrap; }

        .filter-btn {
          padding: 6px 14px;
          border-radius: 100px;
          border: 1px solid rgba(255,255,255,0.1);
          background: transparent;
          color: rgba(255,255,255,0.4);
          font-family: 'Space Mono', monospace;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .filter-btn:hover {
          border-color: rgba(255,122,48,0.4);
          color: rgba(255,122,48,0.8);
        }

        .filter-btn.active {
          background: rgba(255, 100, 0, 0.15);
          border-color: #ff6400;
          color: #ff7a30;
        }

        .status-legend {
          display: flex;
          gap: 16px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }

        .status-legend-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-family: 'Space Mono', monospace;
          font-size: 10px;
          color: rgba(255,255,255,0.4);
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .status-legend-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
        }

        .events-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
          gap: 20px;
        }

        .error-state {
          grid-column: 1 / -1;
          text-align: center;
          padding: 80px 20px;
        }

        .error-icon { font-size: 48px; margin-bottom: 16px; }
        .error-title { font-size: 18px; font-weight: 700; color: #ff4444; margin-bottom: 8px; }

        .error-message {
          font-family: 'Space Mono', monospace;
          font-size: 12px;
          color: rgba(255,255,255,0.3);
          margin-bottom: 24px;
        }

        .retry-btn {
          padding: 10px 24px;
          background: rgba(255,100,0,0.15);
          border: 1px solid #ff6400;
          border-radius: 6px;
          color: #ff7a30;
          font-family: 'Space Mono', monospace;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          cursor: pointer;
          transition: all 0.2s;
        }

        .retry-btn:hover { background: rgba(255,100,0,0.25); }

        .skeleton-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 16px;
          padding: 24px;
        }

        .skeleton-header { display: flex; justify-content: space-between; margin-bottom: 16px; }
        .skeleton-badge { width: 80px; height: 22px; border-radius: 100px; }
        .skeleton-status { width: 60px; height: 22px; border-radius: 100px; }
        .skeleton-title { height: 20px; border-radius: 4px; margin-bottom: 10px; }

        .skeleton-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin: 20px 0;
        }

        .skeleton-stat { height: 64px; border-radius: 10px; }
        .skeleton-button { height: 42px; border-radius: 8px; margin-top: 8px; }

        .shimmer {
          background: linear-gradient(90deg,
            rgba(255,255,255,0.04) 0%,
            rgba(255,255,255,0.08) 50%,
            rgba(255,255,255,0.04) 100%
          );
          background-size: 200% 100%;
          animation: shimmer 1.8s ease-in-out infinite;
        }

        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }

        @media (max-width: 768px) {
          .main-content { padding: 24px 16px 0; }
          .events-grid { grid-template-columns: 1fr; }
          .section-title { font-size: 26px; }
          .hud-stats { display: none; }
        }
      `}</style>

      <header className="hud-header">
        <div className="hud-header-inner">
          <div className="hud-logo">
            <div className="hud-logo-icon">🛰</div>
            <div>
              <div className="hud-logo-text">EONET Monitor</div>
              <div className="hud-logo-sub">NASA Earth Observatory</div>
            </div>
          </div>

          {!loading && !error && (
            <div className="hud-stats">
              <div className="hud-stat">
                <div className="hud-stat-value">{events.length}</div>
                <div className="hud-stat-label">Total</div>
              </div>
              <div className="hud-divider" />
              <div className="hud-stat">
                <div className="hud-stat-value" style={{ color: "#ff4444" }}>{activeCount}</div>
                <div className="hud-stat-label">Active</div>
              </div>
              <div className="hud-divider" />
              <div className="hud-stat">
                <div className="hud-stat-value" style={{ color: "#fbbf24" }}>{staleCount}</div>
                <div className="hud-stat-label">Stale</div>
              </div>
              <div className="hud-divider" />
              <div className="hud-stat">
                <div className="hud-stat-value" style={{ color: "rgba(255,255,255,0.3)" }}>{closedCount}</div>
                <div className="hud-stat-label">Closed</div>
              </div>
              <div className="hud-divider" />
              <div className="live-indicator">
                <div className="live-dot" />
                Live Feed
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="main-content">
        <div className="section-header">
          <div>
            <div className="section-eyebrow">Natural Events Tracker</div>
            <h1 className="section-title">
              {loading ? "Loading Events…" : `${filtered.length} Events Tracked`}
            </h1>
          </div>

          {!loading && !error && (
            <div className="filter-bar">
              {categories.map(cat => (
                <button
                  key={cat}
                  className={`filter-btn ${filter === cat ? "active" : ""}`}
                  onClick={() => setFilter(cat)}
                >
                  {cat !== "All" && (CATEGORY_ICONS[cat] || "●")} {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {!loading && !error && (
          <div className="status-legend">
            <div className="status-legend-item">
              <div className="status-legend-dot" style={{ background: "#4ade80", boxShadow: "0 0 6px #4ade80" }} />
              Active — updated within {STALE_DAYS} days
            </div>
            <div className="status-legend-item">
              <div className="status-legend-dot" style={{ background: "#fbbf24" }} />
              Stale — no updates for {STALE_DAYS}+ days, not officially closed
            </div>
            <div className="status-legend-item">
              <div className="status-legend-dot" style={{ background: "rgba(255,255,255,0.2)" }} />
              Closed — confirmed ended by NASA
            </div>
          </div>
        )}

        <div className="events-grid">
          {loading
            ? [...Array(9)].map((_, i) => <SkeletonCard key={i} />)
            : error
            ? (
              <div className="error-state">
                <div className="error-icon">📡</div>
                <div className="error-title">Signal Lost</div>
                <div className="error-message">{error}</div>
                <button className="retry-btn" onClick={getData}>↻ Retry Connection</button>
              </div>
            )
            : filtered.map((event, i) => (
              <DisasterCard
                key={event.id}
                event={event}
                index={i}
                onViewMap={() => setSelectedEvent(event)}
              />
            ))
          }
        </div>
      </div>

      {selectedEvent && (
        <EventMapModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  );
};

export default Home;