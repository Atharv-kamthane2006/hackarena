import React from "react";

function formatTime(timestamp) {
  if (!timestamp) return "-";
  const d = new Date(timestamp);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

function getEventDotClass(type) {
  if (!type) return "default";
  const t = type.toLowerCase();
  if (t.includes("vibration")) return "vibration";
  if (t.includes("forced") || t.includes("intrusion") || t.includes("break")) return "forced";
  if (t.includes("door") || t.includes("open") || t.includes("close")) return "door";
  return "default";
}

export default function ActivityLog({ events }) {
  return (
    <section className="panel activity-panel" id="activity-log">
      <div className="panel-header">
        <div className="panel-icon activity-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
        </div>
        <div>
          <h2 className="panel-title">Activity Log</h2>
          <p className="panel-subtitle">{events.length} event{events.length !== 1 ? "s" : ""} recorded</p>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="empty-log">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="9" y1="21" x2="9" y2="9" />
          </svg>
          <p>No events recorded yet.<br />Events will appear here in real time.</p>
        </div>
      ) : (
        <ul className="event-list">
          {events.map((event, index) => (
            <li
              key={event.id}
              className="event-item"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="event-type-wrap">
                <span className={`event-dot ${getEventDotClass(event.type)}`} />
                <span className="event-type">
                  {(event.type || "unknown_event").replace(/_/g, " ")}
                </span>
              </div>
              <span className="event-time">
                {formatTime(event.timestamp)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
