# Despacho Agil WebSocket Server

Simple WebSocket server for broadcasting color updates from hardware devices to multiple clients (web pages and other hardware).

## Use Case

1. Hardware device sends color string (e.g., "red", "blue", "green") to the server
2. Server broadcasts the color update to all connected clients
3. Clients (landing page and other hardware) receive and process the color update

## Setup

### Install Dependencies

```bash
pnpm install
```

### Development

```bash
pnpm dev
```

### Build for Production

```bash
pnpm build
```

### Run Production

```bash
pnpm start
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
