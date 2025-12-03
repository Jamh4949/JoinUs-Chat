import { GoogleGenerativeAI } from "@google/generative-ai";
import { ChatMessage } from "../models/meeting";
import dotenv from "dotenv";

dotenv.config();

// Initialize Gemini API
// Ensure you have GEMINI_API_KEY in your .env file
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

/**
 * Generates a summary of the meeting chat using Google Gemini
 * 
 * @param {ChatMessage[]} messages - Array of chat messages
 * @returns {Promise<string>} The generated summary
 */
export const generateMeetingSummary = async (messages: ChatMessage[]): Promise<string> => {
    try {
        if (!process.env.GEMINI_API_KEY) {
            console.error("GEMINI_API_KEY is missing in environment variables");
            return "Error de configuración: No se encontró la API Key de Gemini.";
        }

        if (!messages || messages.length === 0) {
            return "No hubo mensajes en esta reunión.";
        }

        // Format messages for the prompt
        const chatTranscript = messages
            .map(msg => {
                const time = msg.timestamp instanceof Date 
                    ? msg.timestamp.toLocaleString() 
                    : (msg.timestamp as any).toDate().toLocaleString();
                return `${msg.userName} (${time}): ${msg.text}`;
            })
            .join("\n");

        // Use gemini-1.5-flash model which is faster and cheaper
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
            Actúa como un asistente virtual experto en resumir reuniones.
            A continuación se presenta la transcripción del chat de una reunión virtual.
            Por favor, genera un resumen conciso y estructurado de los puntos clave discutidos, 
            decisiones tomadas y tareas asignadas si las hay.
            
            Transcripción del chat:
            ${chatTranscript}
            
            Resumen:
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        return text;
    } catch (error: any) {
        console.error("Error generating meeting summary:", error);
        return `No se pudo generar el resumen. Detalles del error: ${error.message || JSON.stringify(error)}`;
    }
};
