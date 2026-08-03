#include <WiFi.h>
#include <Firebase_ESP_Client.h>

#include "addons/TokenHelper.h"
#include "addons/RTDBHelper.h"

// ===== WiFi =====
#define WIFI_SSID "AK"
#define WIFI_PASSWORD "00000000"

// ===== Firebase =====
#define API_KEY "AIzaSyCgV9o_0f8dQnpQcErHCUbxNLi8tNech6o"
#define DATABASE_URL "https://locker-c5949-default-rtdb.firebaseio.com/"

// ===== Pins =====
#define VIBRATION_PIN 18
#define DOOR_PIN 19
#define BUZZER_PIN 23   // NEW BUZZER PIN

// ===== Timings =====
const unsigned long SENSOR_INTERVAL_MS = 2000;
const unsigned long HEARTBEAT_INTERVAL_MS = 10000;

FirebaseData fbdo;
FirebaseAuth firebaseAuth;
FirebaseConfig firebaseConfig;

unsigned long lastSensorMs = 0;
unsigned long lastHeartbeatMs = 0;
uint32_t heartbeatSeq = 0;

bool prevVibrationDetected = false;
bool prevDoorOpen = false;
bool firebaseReady = false;
bool signupOK = false;

bool updateLockerNode(FirebaseJson &json)
{
  if (!Firebase.RTDB.updateNode(&fbdo, "lockers/locker_01", &json))
  {
    Serial.print("[ERROR] updateNode: ");
    Serial.println(fbdo.errorReason());
    return false;
  }
  return true;
}

void pushEvent(const String &type)
{
  FirebaseJson eventJson;
  eventJson.set("type", type);
  eventJson.set("timestamp/.sv", "timestamp");

  if (!Firebase.RTDB.pushJSON(&fbdo, "events", &eventJson))
  {
    Serial.print("[ERROR] pushEvent: ");
    Serial.println(fbdo.errorReason());
  }
  else
  {
    Serial.print("[EVENT] ");
    Serial.println(type);
  }
}

void sendHeartbeat()
{
  heartbeatSeq++;

  FirebaseJson hbJson;
  hbJson.set("last_seen/.sv", "timestamp");
  hbJson.set("heartbeat_seq", (int)heartbeatSeq);

  if (updateLockerNode(hbJson))
  {
    Serial.print("[HEARTBEAT] seq=");
    Serial.println(heartbeatSeq);
  }
}

void sendSensorState()
{
  int vibrationRaw = digitalRead(VIBRATION_PIN);
  int doorRaw = digitalRead(DOOR_PIN);

  bool vibrationDetected = (vibrationRaw == HIGH);
  bool doorOpen = (doorRaw == LOW);

  String vibration = vibrationDetected ? "detected" : "none";
  String door = doorOpen ? "open" : "closed";

  String status = "safe";

  if (vibrationDetected)
  {
    status = "forced_entry";
    digitalWrite(BUZZER_PIN, HIGH);   // 🔊 BUZZER ON
  }
  else
  {
    digitalWrite(BUZZER_PIN, LOW);    // 🔇 BUZZER OFF
  }

  if (doorOpen)
  {
    status = "open_timeout";
  }

  FirebaseJson stateJson;
  stateJson.set("vibration", vibration);
  stateJson.set("door", door);
  stateJson.set("status", status);
  stateJson.set("last_updated/.sv", "timestamp");

  if (updateLockerNode(stateJson))
  {
    Serial.print("[STATE] status=");
    Serial.print(status);
    Serial.print(" door=");
    Serial.print(door);
    Serial.print(" vibration=");
    Serial.println(vibration);
  }

  if (vibrationDetected && !prevVibrationDetected)
  {
    pushEvent("vibration_detected");
  }
  if (doorOpen && !prevDoorOpen)
  {
    pushEvent("door_opened");
  }
  if (!doorOpen && prevDoorOpen)
  {
    pushEvent("door_closed");
  }

  prevVibrationDetected = vibrationDetected;
  prevDoorOpen = doorOpen;
}

void setup()
{
  Serial.begin(115200);

  pinMode(VIBRATION_PIN, INPUT);
  pinMode(DOOR_PIN, INPUT_PULLUP);

  pinMode(BUZZER_PIN, OUTPUT);     // BUZZER SETUP
  digitalWrite(BUZZER_PIN, LOW);   // BUZZER OFF

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");

  while (WiFi.status() != WL_CONNECTED)
  {
    Serial.print(".");
    delay(300);
  }

  Serial.println("\nWiFi Connected");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());

  firebaseConfig.api_key = API_KEY;
  firebaseConfig.database_url = DATABASE_URL;

  if (Firebase.signUp(&firebaseConfig, &firebaseAuth, "", ""))
  {
    Serial.println("Firebase anonymous signup OK");
    signupOK = true;
  }
  else
  {
    Serial.print("Signup failed: ");
    Serial.println(firebaseConfig.signer.signupError.message.c_str());
  }

  firebaseConfig.token_status_callback = tokenStatusCallback;

  Firebase.begin(&firebaseConfig, &firebaseAuth);
  Firebase.reconnectWiFi(true);
}

void loop()
{
  if (!Firebase.ready() || !signupOK)
  {
    delay(100);
    return;
  }

  if (!firebaseReady)
  {
    firebaseReady = true;
    Serial.println("Firebase ready!");
    sendHeartbeat();
  }

  unsigned long nowMs = millis();

  if (nowMs - lastHeartbeatMs >= HEARTBEAT_INTERVAL_MS)
  {
    lastHeartbeatMs = nowMs;
    sendHeartbeat();
  }

  if (nowMs - lastSensorMs >= SENSOR_INTERVAL_MS)
  {
    lastSensorMs = nowMs;
    sendSensorState();
  }
}