import Groq from "groq-sdk";
import { ChatMessage } from "../models/meeting";
import dotenv from "dotenv";

dotenv.config();

// Initialize Groq API
// Ensure you have GROQ_API_KEY in your .env file
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY || ""
});

/**
 * Generates a summary of the meeting chat using Groq AI (Llama model)
 * 
 * @param {ChatMessage[]} messages - Array of chat messages
 * @returns {Promise<string>} The generated summary
 */
export const generateMeetingSummary = async (messages: ChatMessage[]): Promise<string> => {
    try {
        if (!process.env.GROQ_API_KEY) {
            console.error("GROQ_API_KEY is missing in environment variables");
            return "Error de configuración: No se encontró la API Key de Groq.";
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

        const prompt = `Actúa como un asistente virtual experto en resumir reuniones.
A continuación se presenta la transcripción del chat de una reunión virtual.
Por favor, genera un resumen conciso y estructurado de los puntos clave discutidos, 
decisiones tomadas y tareas asignadas si las hay.

Transcripción del chat:
${chatTranscript}

Resumen:`;

        // Use Llama 3.1 model (fast and free)
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "user",
                    content: prompt
                }
            ],
            model: "llama-3.1-8b-instant",
            temperature: 0.7,
            max_tokens: 1024
        });

        const summary = chatCompletion.choices[0]?.message?.content || "No se pudo generar el resumen.";
        return summary;
    } catch (error: any) {
        console.error("Error generating meeting summary:", error);
        return `No se pudo generar el resumen. Detalles del error: ${error.message || JSON.stringify(error)}`;
    }
};
