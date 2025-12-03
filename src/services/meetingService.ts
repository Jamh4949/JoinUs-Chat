/**
 * Meeting Service
 * 
 * Business logic for managing meetings with Firestore persistence.
 * Handles meeting creation, joining, leaving, and message management.
 * 
 * @module services/meetingService
 */

import { db, COLLECTIONS } from "../utils/firebase";
import { generateMeetingId, isValidMeetingId } from "../utils/validation";
import { generateMeetingSummary } from "./aiService";
import type {
    Meeting,
    MeetingCreateData,
    JoinMeetingData,
    Participant,
    ChatMessage,
} from "../models/meeting";

/**
 * In-memory cache of active meetings for fast access
 * Key: meetingId, Value: Meeting object
 */
const activeMeetings = new Map<string, Meeting>();

/**
 * Maximum number of participants allowed per meeting
 */
const MAX_PARTICIPANTS = 10;

/**
 * Creates a new meeting and stores it in Firestore
 * 
 * @param {MeetingCreateData} data - Meeting creation data
 * @returns {Promise<Meeting>} Created meeting object
 * @throws {Error} If meeting creation fails
 */
export const createMeeting = async (
    data: MeetingCreateData
): Promise<Meeting> => {
    try {
        // Generate unique meeting ID
        let meetingId = generateMeetingId();

        // Ensure uniqueness (check Firestore)
        let exists = await getMeetingById(meetingId);
        while (exists) {
            meetingId = generateMeetingId();
            exists = await getMeetingById(meetingId);
        }

        const meeting: Meeting = {
            meetingId,
            createdBy: data.createdBy,
            createdAt: new Date(),
            participants: [],
            messages: [],
            isActive: true,
            maxParticipants: MAX_PARTICIPANTS,
        };

        // Save to Firestore
        await db.collection(COLLECTIONS.MEETINGS).doc(meetingId).set({
            ...meeting,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Cache in memory
        activeMeetings.set(meetingId, meeting);

        console.log(`✅ Meeting created: ${meetingId} by ${data.createdBy}`);
        return meeting;
    } catch (error) {
        console.error("Error creating meeting:", error);
        throw new Error("Failed to create meeting");
    }
};

/**
 * Retrieves a meeting by ID from cache or Firestore
 * 
 * @param {string} meetingId - Meeting ID to retrieve
 * @returns {Promise<Meeting | null>} Meeting object or null if not found
 */
export const getMeetingById = async (
    meetingId: string
): Promise<Meeting | null> => {
    if (!isValidMeetingId(meetingId)) {
        return null;
    }

    // Check cache first
    if (activeMeetings.has(meetingId)) {
        return activeMeetings.get(meetingId)!;
    }

    // Check Firestore
    try {
        const doc = await db.collection(COLLECTIONS.MEETINGS).doc(meetingId).get();

        if (!doc.exists) {
            return null;
        }

        const data = doc.data() as Meeting;

        // Convert Firestore timestamps to Date objects
        const meeting: Meeting = {
            ...data,
            createdAt: data.createdAt instanceof Date ? data.createdAt : (data.createdAt as any).toDate(),
            participants: data.participants || [],
            messages: (data.messages || []).map((msg: any) => ({
                ...msg,
                timestamp: msg.timestamp instanceof Date ? msg.timestamp : (msg.timestamp as any).toDate()
            })),
        };

        // Cache it
        activeMeetings.set(meetingId, meeting);

        return meeting;
    } catch (error) {
        console.error("Error getting meeting:", error);
        return null;
    }
};

/**
 * Ends a meeting explicitly (by host)
 * 
 * @param {string} meetingId - Meeting ID
 * @param {string} uid - User ID requesting to end the meeting
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const endMeeting = async (
    meetingId: string,
    uid: string
): Promise<{ success: boolean; error?: string }> => {
    try {
        const meeting = await getMeetingById(meetingId);

        if (!meeting) {
            return { success: false, error: "Meeting not found" };
        }

        // Verify ownership
        if (meeting.createdBy !== uid) {
            return { success: false, error: "Only the host can end the meeting" };
        }

        meeting.isActive = false;
        activeMeetings.delete(meetingId);

        // Generate summary immediately
        if (meeting.messages && meeting.messages.length > 0) {
            console.log(`🤖 Generating summary for ended meeting ${meetingId}...`);
            generateMeetingSummary(meeting.messages)
                .then(async (summary) => {
                    await db.collection(COLLECTIONS.MEETINGS).doc(meetingId).update({
                        summary: summary
                    });
                    console.log(`✅ Summary generated for meeting ${meetingId}`);
                })
                .catch(err => console.error("Error generating summary:", err));
        }

        // Update Firestore
        await db.collection(COLLECTIONS.MEETINGS).doc(meetingId).update({
            isActive: false,
        });

        console.log(`🛑 Meeting ${meetingId} ended by host ${uid}`);
        return { success: true };
    } catch (error) {
        console.error("Error ending meeting:", error);
        return { success: false, error: "Failed to end meeting" };
    }
};

/**
 * Adds a participant to a meeting
 * 
 * @param {JoinMeetingData} data - Join meeting data
 * @returns {Promise<{success: boolean, meeting?: Meeting, error?: string}>} Result object
 */
export const joinMeeting = async (
    data: JoinMeetingData
): Promise<{ success: boolean; meeting?: Meeting; error?: string }> => {
    try {
        const meeting = await getMeetingById(data.meetingId);

        if (!meeting) {
            return { success: false, error: "Meeting not found" };
        }

        if (!meeting.isActive) {
            return { success: false, error: "Meeting is no longer active" };
        }

        // Check if user is already in the meeting
        const existingParticipant = meeting.participants.find(
            (p) => p.uid === data.uid
        );

        if (existingParticipant) {
            // Update socket ID if user reconnects
            existingParticipant.socketId = data.socketId;
        } else {
            // Check participant limit
            if (meeting.participants.length >= meeting.maxParticipants) {
                return {
                    success: false,
                    error: `Meeting is full (max ${meeting.maxParticipants} participants)`,
                };
            }

            // Add new participant
            const participant: Participant = {
                uid: data.uid,
                name: data.name,
                socketId: data.socketId,
                joinedAt: new Date(),
            };

            meeting.participants.push(participant);
        }

        // Update Firestore
        await db.collection(COLLECTIONS.MEETINGS).doc(data.meetingId).update({
            participants: meeting.participants,
        });

        // Update cache
        activeMeetings.set(data.meetingId, meeting);

        console.log(`✅ User ${data.name} joined meeting ${data.meetingId}`);
        return { success: true, meeting };
    } catch (error) {
        console.error("Error joining meeting:", error);
        return { success: false, error: "Failed to join meeting" };
    }
};

/**
 * Removes a participant from a meeting
 * 
 * @param {string} meetingId - Meeting ID
 * @param {string} socketId - Socket ID of the participant leaving
 * @returns {Promise<void>}
 */
export const leaveMeeting = async (
    meetingId: string,
    socketId: string
): Promise<void> => {
    try {
        const meeting = await getMeetingById(meetingId);

        if (!meeting) {
            return;
        }

        // Remove participant
        meeting.participants = meeting.participants.filter(
            (p) => p.socketId !== socketId
        );

        // If no participants left, mark meeting as inactive
        if (meeting.participants.length === 0) {
            meeting.isActive = false;
            activeMeetings.delete(meetingId);

            // Generate summary if there are messages
            if (meeting.messages && meeting.messages.length > 0) {
                console.log(`🤖 Generating summary for meeting ${meetingId}...`);
                // Run in background to not block the response
                generateMeetingSummary(meeting.messages)
                    .then(async (summary) => {
                        await db.collection(COLLECTIONS.MEETINGS).doc(meetingId).update({
                            summary: summary
                        });
                        console.log(`✅ Summary generated for meeting ${meetingId}`);
                    })
                    .catch(err => console.error("Error generating summary:", err));
            }
        }

        // Update Firestore
        await db.collection(COLLECTIONS.MEETINGS).doc(meetingId).update({
            participants: meeting.participants,
            isActive: meeting.isActive,
        });

        console.log(`✅ User left meeting ${meetingId}`);
    } catch (error) {
        console.error("Error leaving meeting:", error);
    }
};

/**
 * Adds a message to a meeting's chat history
 * 
 * @param {string} meetingId - Meeting ID
 * @param {ChatMessage} message - Message to add
 * @returns {Promise<void>}
 */
export const addMessage = async (
    meetingId: string,
    message: ChatMessage
): Promise<void> => {
    try {
        const meeting = await getMeetingById(meetingId);

        if (!meeting) {
            throw new Error("Meeting not found");
        }

        meeting.messages.push(message);

        // Update Firestore
        await db.collection(COLLECTIONS.MEETINGS).doc(meetingId).update({
            messages: meeting.messages,
        });

        // Update cache
        activeMeetings.set(meetingId, meeting);
    } catch (error) {
        console.error("Error adding message:", error);
        throw error;
    }
};

/**
 * Gets all participants in a meeting
 * 
 * @param {string} meetingId - Meeting ID
 * @returns {Promise<Participant[]>} Array of participants
 */
export const getParticipants = async (
    meetingId: string
): Promise<Participant[]> => {
    const meeting = await getMeetingById(meetingId);
    return meeting?.participants || [];
};

import admin from "firebase-admin";
