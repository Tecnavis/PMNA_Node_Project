const { Server } = require("socket.io")
const http = require("http")
const express = require("express")

const app = express();
const server = http.createServer(app);

// Add memory usage monitoring
setInterval(() => {
    const memoryUsage = process.memoryUsage();
    console.log(`Memory usage: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`);
}, 30000); // Log every 30 seconds

const io = new Server(server, {
    cors: {
        origin: "*",
    },
    // Add connection limits to prevent memory issues
    maxHttpBufferSize: 1e6, // 1MB max payload
    connectTimeout: 45000,
    pingTimeout: 20000,
    pingInterval: 25000
});

const userSocketMap = {};

// Add cleanup mechanism
setInterval(() => {
    // Remove stale connections
    const now = Date.now();
    Object.entries(userSocketMap).forEach(([userId, socketId]) => {
        if (!io.sockets.sockets.has(socketId)) {
            delete userSocketMap[userId];
        }
    });
}, 60000); // Cleanup every minute

exports.getReceiverSocketId = (userId) => {
    return userSocketMap[userId]
}

io.on("connection", (socket) => {
    console.log("A user connected", socket.id);

    const userId = socket.handshake.query.userId;
    if (userId) {
        userSocketMap[userId] = socket.id;
        
        // Set timeout to auto-remove if client doesn't properly disconnect
        socket.connectionTimer = setTimeout(() => {
            if (socket.connected) {
                socket.disconnect(true);
            }
        }, 3600000); // Auto-disconnect after 1 hour
    }

    io.emit('getOnlineUsers', Object.keys(userSocketMap))

    socket.on('authenticate-logger', (token) => {
        if (token === process.env.LOGGER_SECRET) {
            socket.join('logger-room');
            socket.emit('logger-authenticated');
        }
    });

    socket.on("disconnect", (reason) => {
        console.log("User disconnected:", socket.id, "Reason:", reason);
        if (userId) {
            delete userSocketMap[userId];
        }
        clearTimeout(socket.connectionTimer);
        io.emit('getOnlineUsers', Object.keys(userSocketMap))
    });

    // Handle errors
    socket.on("error", (error) => {
        console.error("Socket error:", error);
    });
});

// Handle process errors
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = { io, app, server };