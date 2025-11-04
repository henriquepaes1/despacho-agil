import express from "express"
import { WebSocketServer, WebSocket } from "ws"
import { createServer } from "http"
import { join } from "path"

const PORT = Number(process.env.PORT) || 8080

type ExtendedWebSocket = WebSocket & { isAlive: boolean }

let currentColor = "none"

// Create Express app
const app = express()

// Serve static files from public folder
app.use(express.static(join(process.cwd(), "public")))

// Health check endpoint
app.get("/health", (req, res) => {
	res.json({ status: "ok", currentColor, clients: wss.clients.size })
})

// Create HTTP server with Express
const server = createServer(app)

// Create WebSocket server attached to HTTP server
const wss = new WebSocketServer({ server })

server.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`)
	console.log(`View the interface at: http://localhost:${PORT}`)
	console.log(`WebSocket endpoint: ws://localhost:${PORT}`)
})

wss.on("connection", (ws: ExtendedWebSocket) => {
	ws.isAlive = true
	console.log("New client connected")

	// Send current color to newly connected client
	ws.send(JSON.stringify({ type: "color", data: currentColor }))

	ws.on("message", (data) => {
		try {
			const message = data.toString().trim()

			// Update current color
			currentColor = message
			console.log(`Color update received: ${currentColor}`)

			// Broadcast to all clients
			const broadcast = JSON.stringify({ type: "color", data: currentColor })
			wss.clients.forEach((client) => {
				if (client.readyState === WebSocket.OPEN) {
					client.send(broadcast)
				}
			})
		} catch (error) {
			console.error("Error processing message:", error)
		}
	})

	ws.on("pong", function (this: ExtendedWebSocket) {
		this.isAlive = true
	})

	ws.on("close", () => {
		console.log("Client disconnected")
	})

	ws.on("error", (error) => {
		console.error("WebSocket error:", error)
	})
})

// Keep-alive mechanism
const interval = setInterval(() => {
	wss.clients.forEach((ws: ExtendedWebSocket) => {
		if (ws.isAlive === false) {
			console.log("Terminating inactive client")
			return ws.terminate()
		}
		ws.isAlive = false
		ws.ping()
	})
}, 30_000)

wss.on("close", () => {
	clearInterval(interval)
	console.log("WebSocket server closed")
})
