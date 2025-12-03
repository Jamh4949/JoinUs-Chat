/**
 * JoinUs Chat Server
 * 
 * Real-time chat server using Socket.IO for video conference meetings.
 * Supports 2-10 users per meeting with real-time messaging.
 * Integrates with Firestore for meeting persistence.
 * 
 * @module server
 */

import express, { Request, Response } from "express";
import { createServer } from "http";
import { Server, Socket } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import {
    createMeeting,
    joinMeeting,
    leaveMeeting,
    endMeeting,
    addMessage,
    getParticipants,
} from "./services/meetingService";
import {
    isValidMeetingId,
    isValidUserData,
    isValidMessage,
} from "./utils/validation";
import type { ChatMessage } from "./models/meeting";

dotenv.config();

const app = express();
const httpServer = createServer(app);

// CORS configuration
const corsOptions = {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) {
            return callback(null, true);
        }

        const allowedOrigins = [
            'http://localhost:5173',
            'http://localhost:5100',
            process.env.CORS_ORIGIN || '',
        ];

        // Allow if origin is in the list OR contains 'vercel.app'
        if (allowedOrigins.includes(origin) || origin.includes('vercel.app')) {
            callback(null, true);
        } else {
            callback(null, false);
        }
    },
    credentials: true,
    methods: ['GET', 'POST'],
};

app.use(cors(corsOptions));
app.use(express.json());

// Socket.IO server with CORS
const io = new Server(httpServer, {
    cors: corsOptions,
});

/**
 * HTTP endpoint to create a new meeting
 * POST /api/meetings/create
 */
app.post("/api/meetings/create", async (req: Request, res: Response) => {
    try {
        const { createdBy, creatorName } = req.body;

        if (!createdBy || !creatorName) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const meeting = await createMeeting({ createdBy, creatorName });

        res.status(201).json({
            success: true,
            meetingId: meeting.meetingId,
            meeting,
        });
    } catch (error) {
        console.error("Error creating meeting:", error);
        res.status(500).json({ error: "Failed to create meeting" });
    }
});

/**
 * HTTP endpoint to end a meeting
 * POST /api/meetings/end
 */
app.post("/api/meetings/end", async (req: Request, res: Response) => {
    try {
        const { meetingId, uid } = req.body;

        if (!meetingId || !uid) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const result = await endMeeting(meetingId, uid);

        if (!result.success) {
            return res.status(400).json({ error: result.error });
        }

        // Notify all participants that meeting ended
        io.to(meetingId).emit("meeting-ended");

        res.json({ success: true });
    } catch (error) {
        console.error("Error ending meeting:", error);
        res.status(500).json({ error: "Failed to end meeting" });
    }
});

/**
 * HTTP endpoint to get meeting info
 * GET /api/meetings/:meetingId
 */
app.get("/api/meetings/:meetingId", async (req: Request, res: Response) => {
    try {
        const { meetingId } = req.params;

        if (!isValidMeetingId(meetingId)) {
            return res.status(400).json({ error: "Invalid meeting ID" });
        }

        const participants = await getParticipants(meetingId);

        res.json({
            success: true,
            participantCount: participants.length,
            participants,
        });
    } catch (error) {
        console.error("Error getting meeting:", error);
        res.status(500).json({ error: "Failed to get meeting" });
    }
});

/**
 * Health check endpoint
 */
app.get("/", (_req: Request, res: Response) => {
    res.send("JoinUs Chat Server is running 🚀");
});

/**
 * Socket.IO connection handler
 */
io.on("connection", (socket: Socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    /**
     * Event: join-meeting
     * User joins a meeting room
     */
    socket.on("join-meeting", async (data: {
        meetingId: string;
        uid: string;
        name: string;
    }) => {
        try {
            const { meetingId, uid, name } = data;

            // Validate input
            if (!isValidMeetingId(meetingId) || !isValidUserData(uid, name)) {
                socket.emit("error", { message: "Invalid meeting data" });
                return;
            }

            // Join meeting
            const result = await joinMeeting({
                meetingId,
                uid,
                name,
                socketId: socket.id,
            });

            if (!result.success) {
                socket.emit("join-error", { message: result.error });
                return;
            }

            // Join Socket.IO room
            socket.join(meetingId);

            // Store meeting ID in socket data for cleanup
            socket.data.meetingId = meetingId;
            socket.data.uid = uid;
            socket.data.name = name;

            // Notify user they joined successfully
            socket.emit("joined-meeting", {
                meetingId,
                participants: result.meeting!.participants,
                messages: result.meeting!.messages,
                createdBy: result.meeting!.createdBy,
            });

            // Notify other participants
            socket.to(meetingId).emit("user-joined", {
                uid,
                name,
                participantCount: result.meeting!.participants.length,
            });

            console.log(`✅ ${name} joined meeting ${meetingId}`);
        } catch (error) {
            console.error("Error joining meeting:", error);
            socket.emit("error", { message: "Failed to join meeting" });
        }
    });

    /**
     * Event: send-message
     * User sends a chat message
     */
    socket.on("send-message", async (data: {
        meetingId: string;
        text: string;
    }) => {
        try {
            const { meetingId, text } = data;
            const { uid, name } = socket.data;

            // Validate message
            if (!isValidMessage(text)) {
                socket.emit("error", { message: "Invalid message" });
                return;
            }

            const message: ChatMessage = {
                id: `${Date.now()}-${uid}`,
                userId: uid,
                userName: name,
                text: text.trim(),
                timestamp: new Date(),
            };

            // Save message to Firestore
            await addMessage(meetingId, message);

            // Broadcast message to all participants in the room
            io.to(meetingId).emit("new-message", message);

            console.log(`💬 Message in ${meetingId} from ${name}: ${text}`);
        } catch (error) {
            console.error("Error sending message:", error);
            socket.emit("error", { message: "Failed to send message" });
        }
    });

    /**
     * Event: disconnect
     * User disconnects from the server
     */
    socket.on("disconnect", async () => {
        try {
            const { meetingId, name } = socket.data;

            if (meetingId) {
                // Remove user from meeting
                await leaveMeeting(meetingId, socket.id);

                // Get updated participant count
                const participants = await getParticipants(meetingId);

                // Notify other participants
                socket.to(meetingId).emit("user-left", {
                    name,
                    participantCount: participants.length,
                });

                console.log(`👋 ${name} left meeting ${meetingId}`);
            }

            console.log(`🔌 Client disconnected: ${socket.id}`);
        } catch (error) {
            console.error("Error handling disconnect:", error);
        }
    });
});

// Start server
const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
    console.log(`🚀 JoinUs Chat Server running on port ${PORT}`);
    console.log(`📡 Socket.IO server ready for connections`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
});
