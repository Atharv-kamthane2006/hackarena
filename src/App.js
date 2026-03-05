import React, { useEffect, useMemo, useState, useCallback } from "react";
import { get, onValue, query, ref } from "firebase/database";
import { db } from "./firebase";
import StatusCard from "./components/StatusCard";
import ActivityLog from "./components/ActivityLog";

const HEARTBEAT_INTERVAL_MS = 10000;
const DEVICE_OFFLINE_THRESHOLD_MS = HEARTBEAT_INTERVAL_MS * 3;

function normalizeEpochMs(rawTimestamp) {
  const n = Number(rawTimestamp);
  if (!Number.isFinite(n) || n <= 0) return null;

  // Accept epoch milliseconds directly.
  if (n >= 1e12) return n;

  // Accept epoch seconds and convert to ms.
  if (n >= 1e9) return n * 1000;

  // Small values are likely ESP uptime millis, not wall-clock timestamps.
  return null;
}

function formatDateTime(timestamp) {
  if (!timestamp) return "Waiting for data...";
  return new Date(timestamp).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

// Icons as inline SVGs
function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function getStatusAccent(status) {
  switch (status) {
    case "forced_entry": return "danger";
    case "open_timeout": return "warning";
    default: return "safe";
  }
}

function getDoorAccent(door) {
  return door === "open" ? "warning" : "safe";
}

function getVibrationAccent(vibration) {
  return vibration === "detected" ? "alert" : "neutral";
}

export default function App() {
  const [lockerData, setLockerData] = useState({
    status: "safe",
    door: "closed",
    vibration: "none",
    last_updated: null,
    last_seen: null,
    heartbeat_seq: null
  });
  const [events, setEvents] = useState([]);
  const [now, setNow] = useState(Date.now());
  const [lastLockerReceiveAt, setLastLockerReceiveAt] = useState(null);
  const [isFirebaseConnected, setIsFirebaseConnected] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem("securelocker-theme");
      return saved === "dark";
    } catch {
      return false;
    }
  });

  const toggleDarkMode = useCallback(() => {
    setDarkMode((prev) => {
      const next = !prev;
      try { localStorage.setItem("securelocker-theme", next ? "dark" : "light"); } catch { }
      return next;
    });
  }, []);

  const parseEvents = useCallback((rawValue, snapshotReceivedAt) => {
    const value = rawValue || {};
    return Object.entries(value)
      .reverse()
      .map(([id, data]) => ({
        id,
        type: data?.type || "unknown_event",
        timestamp: normalizeEpochMs(data?.timestamp),
        syncedAt: snapshotReceivedAt
      }))
      .sort((a, b) => {
        if (a.timestamp && b.timestamp) return b.timestamp - a.timestamp;
        if (a.timestamp) return -1;
        if (b.timestamp) return 1;
        return b.id.localeCompare(a.id, undefined, { numeric: true, sensitivity: "base" });
      });
  }, []);

  // Firebase listeners + polling fallback to avoid stale UI if realtime transport is unstable.
  useEffect(() => {
    const lockerRef = ref(db, "lockers/locker_01");
    const eventsRef = query(ref(db, "events"));
    const connectedRef = ref(db, ".info/connected");

    const unsubLocker = onValue(lockerRef, (snapshot) => {
      const value = snapshot.val();
      if (value) {
        setLastLockerReceiveAt(Date.now());
        setLockerData((prev) => ({ ...prev, ...value }));
      }
    });

    const unsubEvents = onValue(eventsRef, (snapshot) => {
      const snapshotReceivedAt = Date.now();
      setEvents(parseEvents(snapshot.val(), snapshotReceivedAt));
    });

    const unsubConnection = onValue(connectedRef, (snapshot) => {
      setIsFirebaseConnected(snapshot.val() === true);
    });

    const pollTimer = setInterval(async () => {
      try {
        const [lockerSnap, eventsSnap] = await Promise.all([get(lockerRef), get(eventsRef)]);
        const nowTs = Date.now();

        const lockerValue = lockerSnap.val();
        if (lockerValue) {
          setLastLockerReceiveAt(nowTs);
          setLockerData((prev) => ({ ...prev, ...lockerValue }));
        }

        setEvents(parseEvents(eventsSnap.val(), nowTs));
      } catch {
        // Keep using realtime state; polling is only a fallback.
      }
    }, 5000);

    return () => {
      unsubLocker();
      unsubEvents();
      unsubConnection();
      clearInterval(pollTimer);
    };
  }, [parseEvents]);

  // Timer to update "now" for connection status
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const firebaseConnectionState = useMemo(
    () => (isFirebaseConnected ? "Firebase Connected" : "Firebase Disconnected"),
    [isFirebaseConnected]
  );

  const normalizedLastSeen = useMemo(
    () => normalizeEpochMs(lockerData.last_seen),
    [lockerData.last_seen]
  );

  const deviceConnectionState = useMemo(() => {
    if (!normalizedLastSeen) return "ESP32 Offline";
    return now - normalizedLastSeen <= DEVICE_OFFLINE_THRESHOLD_MS
      ? "ESP32 Connected"
      : "ESP32 Offline";
  }, [normalizedLastSeen, now]);

  const normalizedLastUpdated = useMemo(
    () => normalizeEpochMs(lockerData.last_updated) || normalizedLastSeen,
    [lockerData.last_updated, normalizedLastSeen]
  );

  const lastUpdatedDisplay = useMemo(() => {
    if (normalizedLastUpdated) {
      return `${formatDateTime(normalizedLastUpdated)} (device time)`;
    }
    if (lastLockerReceiveAt) {
      return `${formatDateTime(lastLockerReceiveAt)} (last sync)`;
    }
    return "Waiting for data...";
  }, [normalizedLastUpdated, lastLockerReceiveAt]);

  const statusAccent = getStatusAccent(lockerData.status);
  const doorAccent = getDoorAccent(lockerData.door);
  const vibrationAccent = getVibrationAccent(lockerData.vibration);
  const deviceAccent = deviceConnectionState === "ESP32 Offline" ? "danger" : "safe";
  const firebaseAccent = isFirebaseConnected ? "safe" : "danger";

  return (
    <div className={`app-shell ${darkMode ? "theme-dark" : "theme-light"}`}>
      <div className="app-content">
        {/* ===== HEADER ===== */}
        <header className="app-header" id="dashboard-header">
          <div className="header-brand">
            <div className="brand-icon">
              <svg viewBox="0 0 24 24">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <div className="header-text">
              <h1>SecureLocker Dashboard</h1>
              <p className="subtitle">Real-time IoT locker monitoring</p>
            </div>
          </div>

          <div className="header-actions">
            <div
              className={`connection-badge ${isFirebaseConnected ? "online" : "offline"}`}
              id="firebase-connection-indicator"
            >
              <span className="connection-dot" />
              <span>{firebaseConnectionState}</span>
            </div>

            <div
              className={`connection-badge ${deviceConnectionState === "ESP32 Connected" ? "online" : "offline"}`}
              id="device-connection-indicator"
            >
              <span className="connection-dot" />
              <span>{deviceConnectionState}</span>
            </div>

            <button
              className="theme-toggle"
              onClick={toggleDarkMode}
              aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
              id="theme-toggle-btn"
            >
              {darkMode ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>
        </header>

        {/* ===== STATS BAR ===== */}
        <div className="stats-bar" id="stats-overview">
          <div className={`stat-card ${statusAccent}-accent`}>
            <div className="stat-label">Locker</div>
            <div className={`stat-value ${statusAccent}`}>
              {(lockerData.status || "safe").replace(/_/g, " ")}
            </div>
          </div>
          <div className={`stat-card ${doorAccent}-accent`}>
            <div className="stat-label">Door</div>
            <div className={`stat-value ${doorAccent}`}>
              {lockerData.door || "closed"}
            </div>
          </div>
          <div className={`stat-card ${vibrationAccent}-accent`}>
            <div className="stat-label">Vibration</div>
            <div className={`stat-value ${vibrationAccent === "alert" ? "alert" : "neutral"}`}>
              {lockerData.vibration || "none"}
            </div>
          </div>
          <div className={`stat-card ${firebaseAccent}-accent`}>
            <div className="stat-label">Firebase</div>
            <div className={`stat-value ${firebaseAccent}`}>
              {isFirebaseConnected ? "Connected" : "Disconnected"}
            </div>
          </div>
          <div className={`stat-card ${deviceAccent}-accent`}>
            <div className="stat-label">ESP32 Device</div>
            <div className={`stat-value ${deviceAccent}`}>
              {deviceConnectionState === "ESP32 Connected" ? "Online" : "Offline"}
            </div>
          </div>
        </div>

        {/* ===== MAIN GRID ===== */}
        <main className="dashboard-grid" id="dashboard-main">
          <StatusCard
            lockerStatus={lockerData.status || "safe"}
            doorState={lockerData.door || "closed"}
            vibrationState={lockerData.vibration || "none"}
            lastUpdated={lastUpdatedDisplay}
            deviceConnectionState={deviceConnectionState}
            firebaseConnectionState={firebaseConnectionState}
            heartbeatSeq={lockerData.heartbeat_seq}
          />
          <ActivityLog events={events} />
        </main>
      </div>
    </div>
  );
}
