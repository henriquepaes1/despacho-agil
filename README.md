# Despacho Agil WebSocket Server

Simple WebSocket server for broadcasting color updates from hardware devices to multiple clients (web pages and other hardware).

## Use Case

1. Hardware device sends color string (e.g., "red", "blue", "green") to the server
2. Server broadcasts the color update to all connected clients
3. Clients (landing page and other hardware) receive and process the color update

## Setup

### Install Dependencies

```bash
npm install
```

### Development

```bash
npm run dev
```

### Build for Production

```bash
npm run build
```

### Run Production

```bash
npm start
```

## Deploy to Railway

### Quick Deploy

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Ready for Railway deployment"
   git push origin main
   ```

2. **Create Railway Project**
   - Go to [Railway.app](https://railway.app)
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

3. **Railway Auto-Detects Everything**
   - Detects Node.js project
   - Runs `npm install`
   - Runs `npm run build`
   - Runs `npm start`
   - Assigns a PORT automatically

4. **Get Your URL**
   - Railway will provide a URL like: `https://your-app.up.railway.app`
   - Visit the URL in browser → See the landing page
   - WebSocket automatically connects to `wss://your-app.up.railway.app`

### Testing Your Deployment

Once deployed:
- **Web Interface**: Visit `https://your-app.up.railway.app` in browser
- **Health Check**: `https://your-app.up.railway.app/health`
- **Hardware Connection**: Use `wss://your-app.up.railway.app` in your code

## Usage

### Hardware (Sending Colors)

```python
import websocket
import time

ws = websocket.create_connection("ws://localhost:8080")  # or wss://your-app.railway.app

# Send color updates
ws.send("red")
time.sleep(1)
ws.send("blue")
time.sleep(1)
ws.send("green")

ws.close()
```

### Client (Receiving Colors)

```javascript
const ws = new WebSocket('ws://localhost:8080') // or wss://your-app.railway.app

ws.onopen = () => {
  console.log('Connected to server')
}

ws.onmessage = (event) => {
  const data = JSON.parse(event.data)
  console.log('Color received:', data.data)

  // Update UI or hardware based on color
  if (data.type === 'color') {
    document.body.style.backgroundColor = data.data
  }
}

ws.onerror = (error) => {
  console.error('WebSocket error:', error)
}

ws.onclose = () => {
  console.log('Disconnected from server')
}
```

## Message Format

The server sends messages in JSON format:

```json
{
  "type": "color",
  "data": "red"
}
```

Hardware devices should send plain text color strings (e.g., "red", "blue", "green").

## Environment Variables

- `PORT`: WebSocket server port (default: 8080, automatically set by Railway)

## Features

- Broadcasts color updates to all connected clients
- Maintains current color state for new connections
- Keep-alive mechanism to detect and remove inactive clients
- Simple and lightweight implementation

## Hardware Integration

### ESP32-CAM Integration (Color Sender)

The ESP32-CAM detects the majority color (red, green, or blue) and sends it to the server via WebSocket.

#### Required Libraries
```cpp
#include <WiFi.h>
#include <WebSocketsClient.h>
```

#### Basic Implementation
```cpp
#include <WiFi.h>
#include <WebSocketsClient.h>

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* websocket_server = "192.168.1.100"; // Your server IP
const uint16_t websocket_port = 8080;

WebSocketsClient webSocket;

void setup() {
  Serial.begin(115200);

  // Connect to WiFi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected");

  // Connect to WebSocket server
  webSocket.begin(websocket_server, websocket_port, "/");
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);

  // Initialize your camera here
}

void loop() {
  webSocket.loop();

  // Detect color from camera
  String color = detectMajorityColor(); // Your color detection function

  if (color != "") {
    webSocket.sendTXT(color); // Send "red", "green", or "blue"
    Serial.println("Sent: " + color);
  }

  delay(1000);
}

void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED:
      Serial.println("Disconnected");
      break;
    case WStype_CONNECTED:
      Serial.println("Connected to server");
      break;
    case WStype_TEXT:
      Serial.printf("Received: %s\n", payload);
      break;
  }
}
```

**Send color as plain text**: `webSocket.sendTXT("red")` or `"green"` or `"blue"`

---

### Arduino Integration (Color Listener)

The Arduino board connects to the server and listens for color updates.

#### Required Libraries
```cpp
#include <WiFi.h>            // or <ESP8266WiFi.h> for ESP8266
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
```

#### Basic Implementation
```cpp
#include <WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* websocket_server = "192.168.1.100"; // Your server IP
const uint16_t websocket_port = 8080;

WebSocketsClient webSocket;

void setup() {
  Serial.begin(115200);

  // Connect to WiFi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected");

  // Connect to WebSocket server
  webSocket.begin(websocket_server, websocket_port, "/");
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);

  // Initialize your hardware (LEDs, motors, etc.)
}

void loop() {
  webSocket.loop();
}

void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED:
      Serial.println("Disconnected");
      break;

    case WStype_CONNECTED:
      Serial.println("Connected to server");
      break;

    case WStype_TEXT:
      Serial.printf("Received: %s\n", payload);
      handleColorUpdate((char*)payload);
      break;
  }
}

void handleColorUpdate(char* payload) {
  // Parse JSON: {"type":"color","data":"red"}
  StaticJsonDocument<200> doc;
  deserializeJson(doc, payload);

  const char* type = doc["type"];
  const char* color = doc["data"];

  if (strcmp(type, "color") == 0) {
    Serial.print("Color: ");
    Serial.println(color);

    // Control your hardware based on color
    if (strcmp(color, "red") == 0) {
      // Turn on red LED, move servo, etc.
    } else if (strcmp(color, "green") == 0) {
      // Turn on green LED, etc.
    } else if (strcmp(color, "blue") == 0) {
      // Turn on blue LED, etc.
    }
  }
}
```

**Receive color as JSON**: `{"type":"color","data":"red"}`

---

### Required Arduino Libraries

Install via Arduino Library Manager:
- **WebSockets** by Markus Sattler (arduinoWebSockets)
- **ArduinoJson** by Benoit Blanchon (v6 or higher)

---

### Connection Details

- **Local development**: `ws://localhost:8080/`
- **Local network**: `ws://192.168.1.100:8080/` (use your server IP)
- **Production (Railway)**: `wss://https://despacho-agil-production.up.railway.app/`

Server automatically sends current color when hardware connects.
