import React from "react";

function getStatusTone(status) {
  switch (status) {
    case "forced_entry": return "danger";
    case "open_timeout": return "warning";
    default: return "safe";
  }
}

function getDoorTone(door) {
  return door === "open" ? "warning" : "safe";
}

function getVibrationTone(vibration) {
  return vibration === "detected" ? "alert" : "neutral";
}

function getConnectionTone(connection) {
  return connection === "ESP32 Offline" ? "danger" : "safe";
}

function StatusRow({ label, value, tone, pulse, icon }) {
  return (
    <div className="status-row">
      <span className="status-label">
        <span className={`status-label-icon ${tone}-bg`}>
          {icon}
        </span>
        {label}
      </span>
      <div className="status-value-wrap">
        <span className={`status-badge ${tone}`}>
          <span className={`status-dot ${tone} ${pulse ? "pulse" : ""}`} />
          {value}
        </span>
      </div>
    </div>
  );
}

export default function StatusCard({
  lockerStatus,
  doorState,
  vibrationState,
  lastUpdated,
  connectionState
}) {
  const statusTone = getStatusTone(lockerStatus);
  const doorTone = getDoorTone(doorState);
  const vibrationTone = getVibrationTone(vibrationState);
  const connectionTone = getConnectionTone(connectionState);

  return (
    <section className="panel" id="status-card">
      <div className="panel-header">
        <div className="panel-icon status-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <div>
          <h2 className="panel-title">Locker Status</h2>
          <p className="panel-subtitle">Real-time sensor readings</p>
        </div>
      </div>

      <div className="status-list">
        <StatusRow
          label="Locker Status"
          value={lockerStatus.replace(/_/g, " ")}
          tone={statusTone}
          pulse={lockerStatus === "forced_entry"}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          }
        />
        <StatusRow
          label="Door State"
          value={doorState}
          tone={doorTone}
          pulse={doorState === "open"}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 20V6a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v14" />
              <path d="M2 20h20" />
              <path d="M14 12v.01" />
            </svg>
          }
        />
        <StatusRow
          label="Vibration"
          value={vibrationState}
          tone={vibrationTone}
          pulse={vibrationState === "detected"}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12h2" />
              <path d="M20 12h2" />
              <path d="M6 8v8" />
              <path d="M18 8v8" />
              <path d="M10 4v16" />
              <path d="M14 4v16" />
            </svg>
          }
        />
        <StatusRow
          label="ESP32 Connection"
          value={connectionState === "ESP32 Connected" ? "Connected" : "Offline"}
          tone={connectionTone}
          pulse={connectionState === "ESP32 Offline"}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12.55a11 11 0 0 1 14.08 0" />
              <path d="M1.42 9a16 16 0 0 1 21.16 0" />
              <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
              <line x1="12" y1="20" x2="12.01" y2="20" />
            </svg>
          }
        />
      </div>

      <div className="last-updated">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        Last updated: {lastUpdated}
      </div>
    </section>
  );
}
