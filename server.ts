import express from "express";
import { createServer as createViteServer } from "vite";
import { Server } from "socket.io";
import http from "http";

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = 3000;

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Multiplayer Logic
  interface PlayerProfile {
    id: string;
    name: string;
    avatar: string;
  }
  
  interface Room {
    p1: { id: string, profile: PlayerProfile };
    p2: { id: string, profile: PlayerProfile } | null;
    state: string;
  }

  const rooms = new Map<string, Room>();

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("create_room", (data, callback) => {
      const roomId = Math.random().toString(36).substring(2, 6).toUpperCase();
      rooms.set(roomId, { p1: { id: socket.id, profile: data.profile }, p2: null, state: 'waiting' });
      socket.join(roomId);
      callback({ roomId });
    });

    socket.on("join_room", (data, callback) => {
      const room = rooms.get(data.roomId);
      if (room && !room.p2) {
        room.p2 = { id: socket.id, profile: data.profile };
        socket.join(data.roomId);
        
        // Notify host that player joined
        socket.to(data.roomId).emit("player_joined", {
          profile: data.profile
        });
        
        callback({ success: true, p1Profile: room.p1.profile });
      } else {
        callback({ success: false, message: "Room not found or full" });
      }
    });

    socket.on("start_match", (data) => {
      const room = rooms.get(data.roomId);
      if (room && room.p1.id === socket.id && room.p2) {
        room.state = 'playing';
        io.to(data.roomId).emit("game_start", {
          p1: room.p1.profile,
          p2: room.p2.profile
        });
      }
    });

    socket.on("place_block", (data) => {
      // Broadcast to the room
      socket.to(data.roomId).emit("opponent_placed_block", data);
    });
    
    socket.on("game_over", (data) => {
      socket.to(data.roomId).emit("opponent_game_over", data);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
      // Clean up rooms
      rooms.forEach((room, roomId) => {
        if (room.p1?.id === socket.id || room.p2?.id === socket.id) {
          io.to(roomId).emit("opponent_disconnected");
          rooms.delete(roomId);
        }
      });
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
