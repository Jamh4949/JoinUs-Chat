/**
 * Validation Utilities
 * 
 * Input validation functions for meeting operations.
 * 
 * @module utils/validation
 */

/**
 * Validates a meeting ID format
 * Meeting IDs must be exactly 6 digits
 * 
 * @param {string} meetingId - Meeting ID to validate
 * @returns {boolean} True if valid, false otherwise
 */
export const isValidMeetingId = (meetingId: string): boolean => {
    return /^\d{6}$/.test(meetingId);
};

/**
 * Validates user data for joining a meeting
 * 
 * @param {string} uid - User ID
 * @param {string} name - User name
 * @returns {boolean} True if valid, false otherwise
 */
export const isValidUserData = (uid: string, name: string): boolean => {
    return (
        typeof uid === "string" &&
        uid.trim().length > 0 &&
        typeof name === "string" &&
        name.trim().length > 0
    );
};

/**
 * Validates message content
 * 
 * @param {string} text - Message text
 * @returns {boolean} True if valid, false otherwise
 */
export const isValidMessage = (text: string): boolean => {
    return typeof text === "string" && text.trim().length > 0 && text.length <= 1000;
};

/**
 * Generates a random 6-digit meeting ID
 * 
 * @returns {string} 6-digit meeting ID
 */
export const generateMeetingId = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};
