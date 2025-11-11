import express from "express"
import { WebSocketServer, WebSocket } from "ws"
import { createServer } from "http"
import { join } from "path"

const PORT = Number(process.env.PORT) || 8080

type ExtendedWebSocket = WebSocket & { isAlive: boolean }

let currentColor = "none"

// Debouncing configuration
const BUFFER_SIZE = 20
const CONFIDENCE_THRESHOLD = 0.6 // 60% of samples must agree
const colorBuffer: string[] = []

// Calculate the most frequent color in the buffer (mode)
function getMostFrequentColor(): string | null {
	if (colorBuffer.length === 0) return null

	// Count occurrences of each color
	const colorCounts = new Map<string, number>()
	for (const color of colorBuffer) {
		colorCounts.set(color, (colorCounts.get(color) || 0) + 1)
	}

	// Find the color with the highest count
	let maxCount = 0
	let mostFrequentColor: string | null = null

	for (const [color, count] of colorCounts.entries()) {
		if (count > maxCount) {
			maxCount = count
			mostFrequentColor = color
		}
	}

	// Check if it meets the confidence threshold
	const confidence = maxCount / colorBuffer.length
	if (confidence >= CONFIDENCE_THRESHOLD) {
		return mostFrequentColor
	}

	return null // No clear winner
}

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

			// Add to buffer (sliding window)
			colorBuffer.push(message)
			if (colorBuffer.length > BUFFER_SIZE) {
				colorBuffer.shift() // Remove oldest entry
			}

			// Get the most frequent color from the buffer
			const votedColor = getMostFrequentColor()

			// Only broadcast if we have a confident decision and it's different from current
			if (votedColor && votedColor !== currentColor) {
				const previousColor = currentColor
				currentColor = votedColor

				console.log(
					`Color changed: ${previousColor} -> ${currentColor} (buffer: ${colorBuffer.length})`
				)

				// Broadcast to all clients
				const broadcast = JSON.stringify({ type: "color", data: currentColor })
				wss.clients.forEach((client) => {
					if (client.readyState === WebSocket.OPEN) {
						client.send(broadcast)
					}
				})
			} else if (votedColor) {
				// Same color, no broadcast needed
				console.log(`Color confirmed: ${currentColor} (no change)`)
			} else {
				// No confident decision yet
				console.log(`Buffering... (${colorBuffer.length}/${BUFFER_SIZE})`)
			}
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
