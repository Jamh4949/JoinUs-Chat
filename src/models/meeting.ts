/**
 * Meeting Model
 * 
 * Represents a video conference meeting room with chat capabilities.
 * Meetings are stored in Firestore and managed in-memory for active sessions.
 * 
 * @module models/meeting
 */

/**
 * Interface for a meeting participant
 * @interface Participant
 */
export interface Participant {
    /** Unique user ID from Firebase Authentication */
    uid: string;
    /** User's display name */
    name: string;
    /** Socket ID for real-time communication */
    socketId: string;
    /** Timestamp when user joined the meeting */
    joinedAt: Date;
}

/**
 * Interface for a chat message
 * @interface ChatMessage
 */
export interface ChatMessage {
    /** Unique message ID */
    id: string;
    /** User ID of the sender */
    userId: string;
    /** Display name of the sender */
    userName: string;
    /** Message content */
    text: string;
    /** Timestamp when message was sent */
    timestamp: Date;
}

/**
 * Interface for a meeting room
 * @interface Meeting
 */
export interface Meeting {
    /** Unique 6-digit meeting ID */
    meetingId: string;
    /** User ID of the meeting creator */
    createdBy: string;
    /** Timestamp when meeting was created */
    createdAt: Date;
    /** Array of current participants */
    participants: Participant[];
    /** Chat message history */
    messages: ChatMessage[];
    /** AI-generated summary of the chat */
    summary?: string;
    /** Whether the meeting is active */
    isActive: boolean;
    /** Maximum number of participants allowed */
    maxParticipants: number;
}

/**
 * Type for meeting creation data
 * @typedef MeetingCreateData
 */
export interface MeetingCreateData {
    /** User ID of the creator */
    createdBy: string;
    /** Creator's display name */
    creatorName: string;
}

/**
 * Type for joining a meeting
 * @typedef JoinMeetingData
 */
export interface JoinMeetingData {
    /** Meeting ID to join */
    meetingId: string;
    /** User ID joining */
    uid: string;
    /** User's display name */
    name: string;
    /** Socket ID for real-time communication */
    socketId: string;
}
