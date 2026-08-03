# SecureLocker Dashboard

SecureLocker is an IoT security-monitoring project built around an ESP32 locker controller and a React dashboard. The device reports door and vibration readings to Firebase Realtime Database. Authenticated users can monitor the locker in real time and receive email alerts for suspicious activity.

## Features

- Firebase Email/Password sign-in and registration
- Live locker, door, vibration, Firebase, and ESP32 connection status
- Realtime activity log with `vibration_detected`, `door_opened`, and `door_closed` events
- ESP32 heartbeat monitoring (device marked offline after 30 seconds without a heartbeat)
- Automatic buzzer activation on vibration detection
- EmailJS alert emails for vibration or fault states (5-minute cooldown)
- Responsive light and dark dashboard themes

---

## Project Structure

```text
src/
├── App.js                  # Authentication, Firebase listeners, alerts, dashboard
├── firebase.js             # Firebase initialization
└── components/             # UI components

hackarenafinal/
└── hackarenafinal.ino      # ESP32 firmware

public/                     # Static assets
