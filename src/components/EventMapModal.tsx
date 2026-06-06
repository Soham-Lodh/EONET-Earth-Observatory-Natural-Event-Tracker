import { useEffect, useRef, useState } from "react";
import type { DisasterEvent } from "../types/eonet";

interface Props {
  event: DisasterEvent;
  onClose: () => void;
}

const CATEGORY_CONFIG: Record<string, { color: string }> = {
  "Wildfires":            { color: "#ff6400" },
  "Severe Storms":        { color: "#60a5fa" },
  "Volcanoes":            { color: "#f87171" },
  "Floods":               { color: "#34d399" },
  "Earthquakes":          { color: "#a78bfa" },
  "Sea and Lake Ice":     { color: "#7dd3fc" },
  "Landslides":           { color: "#d6b17a" },
  "Drought":              { color: "#fbbf24" },
  "Dust and Haze":        { color: "#9ca3af" },
  "Manmade":              { color: "#94a3b8" },
  "Snow":                 { color: "#bae6fd" },
  "Temperature Extremes": { color: "#fb923c" },
  "Water Color":          { color: "#38bdf8" },
};

const DEFAULT_COLOR = "#e8e4d9";

const formatDate = (dateStr: string) => {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleString("en-US", {
      month: "short", day: "numeric", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return "—"; }
};

const EventMapModal = ({ event, onClose }: Props) => {
  if (!event) return null;
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);

  const accentColor = (CATEGORY_CONFIG[event.category] || { color: DEFAULT_COLOR }).color;

  const positions: [number, number][] = event.points.map(
    (p) => [p.coordinates[1], p.coordinates[0]] as [number, number]
  );

  useEffect(() => {
    if (!mapRef.current) return;

    import("leaflet").then((L) => {
      if (leafletMapRef.current) return;

      const map = L.map(mapRef.current!, {
        zoomControl: true,
        attributionControl: true,
        center: [20, 0],
        zoom: 2,
      });

      leafletMapRef.current = map;

      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          attribution: "Esri, Maxar, Earthstar Geographics",
          maxZoom: 19,
        }
      ).addTo(map);

      if (positions.length > 1) {
        L.polyline(positions, {
          color: accentColor,
          weight: 2.5,
          opacity: 0.7,
          dashArray: "6, 4",
        }).addTo(map);
      }

      event.points.forEach((point, index) => {
        const isFirst = index === 0;
        const isLast = index === event.points.length - 1;
        const lat = point.coordinates[1];
        const lng = point.coordinates[0];

        const fillColor = isFirst
          ? "#4ade80"
          : isLast
          ? (event.closed ? "#888" : "#ff4444")
          : accentColor;

        const radius = isFirst || isLast ? 10 : 5;

        const circle = L.circleMarker([lat, lng], {
          radius,
          color: fillColor,
          weight: isFirst || isLast ? 2.5 : 1,
          fillColor,
          fillOpacity: isFirst || isLast ? 0.95 : 0.65,
        }).addTo(map);

        const label = isFirst
          ? "● Origin"
          : (isLast && !isFirst) ? "● Last Known" : "";

        circle.bindPopup(`
          <div style="font-family:'Space Mono',monospace;font-size:11px;min-width:180px;color:#e8e4d9">
            <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:700;color:#f5f0e8;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.1)">
              ${event.title}
            </div>
            <div style="display:flex;justify-content:space-between;gap:12px;margin-bottom:3px">
              <span style="color:rgba(255,255,255,0.4)">Point</span>
              <span>${index + 1} / ${event.points.length}</span>
            </div>
            <div style="display:flex;justify-content:space-between;gap:12px;margin-bottom:3px">
              <span style="color:rgba(255,255,255,0.4)">Date</span>
              <span>${formatDate(point.date)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;gap:12px;margin-bottom:3px">
              <span style="color:rgba(255,255,255,0.4)">Coords</span>
              <span>${lat.toFixed(4)}, ${lng.toFixed(4)}</span>
            </div>
            ${point.magnitudeValue > 0 ? `
            <div style="display:flex;justify-content:space-between;gap:12px;margin-bottom:3px">
              <span style="color:rgba(255,255,255,0.4)">Magnitude</span>
              <span style="color:${accentColor}">${point.magnitudeValue} ${event.magnitudeUnit}</span>
            </div>` : ""}
            ${label ? `<div style="display:inline-block;margin-top:6px;padding:2px 8px;border-radius:100px;font-size:10px;font-weight:700;background:${isFirst ? "rgba(74,222,128,0.15)" : "rgba(255,68,68,0.15)"};color:${isFirst ? "#4ade80" : "#ff6060"}">${label}</div>` : ""}
          </div>
        `, { className: "dark-popup" });
      });

      map.invalidateSize();

      if (positions.length === 1) {
        map.setView(positions[0], 8);
      } else if (positions.length > 1) {
        const bounds = (L as any).latLngBounds(positions);
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 12 });
      }

      setMapReady(true);
    });

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@600;700;800&display=swap');

        .modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: rgba(4, 6, 10, 0.88);
          backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          animation: overlayFadeIn 0.2s ease;
        }

        @keyframes overlayFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        .modal-panel {
          width: 100%;
          max-width: 1100px;
          height: calc(100vh - 64px);
          background: #0d1219;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 20px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          animation: panelSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 40px 80px rgba(0,0,0,0.7);
        }

        @keyframes panelSlideIn {
          from { opacity: 0; transform: scale(0.96) translateY(16px); }
          to   { opacity: 1; transform: scale(1)   translateY(0); }
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 22px;
          border-bottom: 1px solid rgba(255,255,255,0.07);
          flex-shrink: 0;
          gap: 16px;
          background: rgba(255,255,255,0.02);
        }

        .modal-title-group { flex: 1; min-width: 0; }

        .modal-eyebrow {
          font-family: 'Space Mono', monospace;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          margin-bottom: 3px;
        }

        .modal-title {
          font-family: 'Syne', sans-serif;
          font-size: 19px;
          font-weight: 800;
          color: #f5f0e8;
          letter-spacing: -0.01em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .modal-stats {
          display: flex;
          gap: 10px;
          flex-shrink: 0;
        }

        .modal-stat {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 10px;
          padding: 8px 14px;
          text-align: center;
        }

        .modal-stat-value {
          font-family: 'Space Mono', monospace;
          font-size: 16px;
          font-weight: 700;
          line-height: 1;
        }

        .modal-stat-label {
          font-family: 'Space Mono', monospace;
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: rgba(255,255,255,0.3);
          margin-top: 3px;
        }

        .close-btn {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.5);
          font-size: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          flex-shrink: 0;
          line-height: 1;
        }

        .close-btn:hover {
          background: rgba(255, 60, 60, 0.15);
          border-color: rgba(255, 60, 60, 0.4);
          color: #ff6060;
        }

        .map-wrap {
          flex: 1;
          min-height: 0;
          position: relative;
        }

        .dark-popup .leaflet-popup-content-wrapper {
          background: #131a24 !important;
          border: 1px solid rgba(255,255,255,0.12) !important;
          border-radius: 10px !important;
          color: #e8e4d9 !important;
          box-shadow: 0 8px 24px rgba(0,0,0,0.5) !important;
          padding: 0 !important;
        }

        .dark-popup .leaflet-popup-content {
          margin: 12px 14px !important;
          color: #e8e4d9 !important;
        }

        .dark-popup .leaflet-popup-tip-container .leaflet-popup-tip {
          background: #131a24 !important;
        }

        .dark-popup .leaflet-popup-close-button {
          color: rgba(255,255,255,0.4) !important;
          top: 8px !important;
          right: 8px !important;
        }

        .map-loading {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0d1219;
          z-index: 10;
          transition: opacity 0.4s ease;
          pointer-events: none;
        }

        .map-loading.hidden { opacity: 0; }

        .map-spinner {
          width: 32px;
          height: 32px;
          border: 2px solid rgba(255,255,255,0.08);
          border-radius: 50%;
          margin: 0 auto 12px;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        .map-loading-text {
          font-family: 'Space Mono', monospace;
          font-size: 11px;
          color: rgba(255,255,255,0.3);
          text-transform: uppercase;
          letter-spacing: 0.12em;
        }

        .map-legend {
          position: absolute;
          bottom: 16px;
          left: 16px;
          z-index: 1000;
          background: rgba(13, 18, 25, 0.9);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          padding: 10px 14px;
          font-family: 'Space Mono', monospace;
          font-size: 10px;
          color: rgba(255,255,255,0.4);
          backdrop-filter: blur(8px);
          pointer-events: none;
        }

        .legend-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 5px;
        }

        .legend-row:last-child { margin-bottom: 0; }

        .legend-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        @media (max-width: 700px) {
          .modal-stats { display: none; }
          .modal-title { font-size: 15px; }
        }
      `}</style>

      <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="modal-panel">

          <div className="modal-header">
            <div className="modal-title-group">
              <div className="modal-eyebrow" style={{ color: accentColor }}>
                {event.category} · Track Analysis
              </div>
              <div className="modal-title">{event.title}</div>
            </div>

            <div className="modal-stats">
              <div className="modal-stat">
                <div className="modal-stat-value" style={{ color: accentColor }}>
                  {event.points.length}
                </div>
                <div className="modal-stat-label">Points</div>
              </div>
              {event.magnitudeValue > 0 && (
                <div className="modal-stat">
                  <div className="modal-stat-value" style={{ color: "#f5f0e8" }}>
                    {event.magnitudeValue}
                  </div>
                  <div className="modal-stat-label">{event.magnitudeUnit || "Mag"}</div>
                </div>
              )}
              <div className="modal-stat">
                <div
                  className="modal-stat-value"
                  style={{ color: event.closed ? "rgba(255,255,255,0.3)" : "#4ade80" }}
                >
                  {event.closed ? "Closed" : "Active"}
                </div>
                <div className="modal-stat-label">Status</div>
              </div>
            </div>

            <button className="close-btn" onClick={onClose} aria-label="Close map">✕</button>
          </div>

          <div className="map-wrap">
            <div ref={mapRef} style={{ width: "100%", height: "100%" }} />

            <div className={`map-loading ${mapReady ? "hidden" : ""}`}>
              <div style={{ textAlign: "center" }}>
                <div
                  className="map-spinner"
                  style={{ borderTopColor: accentColor }}
                />
                <div className="map-loading-text">Plotting {event.points.length} points…</div>
              </div>
            </div>

            {mapReady && (
              <div className="map-legend">
                <div className="legend-row">
                  <div className="legend-dot" style={{ background: "#4ade80" }} />
                  Origin
                </div>
                {event.points.length > 2 && (
                  <div className="legend-row">
                    <div className="legend-dot" style={{ background: accentColor }} />
                    {event.points.length - 2} track points
                  </div>
                )}
                <div className="legend-row">
                  <div className="legend-dot" style={{ background: event.closed ? "#888" : "#ff4444" }} />
                  Last known
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
};

export default EventMapModal;