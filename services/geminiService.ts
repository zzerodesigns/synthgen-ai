import { GoogleGenAI, Type } from "@google/genai";
import { GeneratedCode } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
// Switched to Flash for faster inference as requested
const MODEL_ID = "gemini-3-flash-preview";

export const generateSynthCodeFromAudio = async (base64Audio: string, mimeType: string): Promise<GeneratedCode> => {
  const systemInstruction = `
    You are an expert Audio DSP Engineer.
    Return ONLY valid JSON. Structure:
    {
        "code": "function body string (no signature)",
        "explanation": "concise technical summary",
        "soundDescription": "short creative name"
    }
    The code is the BODY of: function playEffect(ctx, destination) { ... }
    Use 'ctx' (AudioContext), connect to 'destination'. Clean up nodes using stop() or garbage collection.
    
    Process:
    1. Analyze the audio's waveform, spectrogram, and frequency content.
    2. Reconstruct the sound using Web Audio API nodes (Oscillators, Gains, Filters, Noise).
    3. Ensure the code runs immediately and produces sound.
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_ID,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Audio,
            },
          },
          {
            text: "Analyze this audio file's characteristics (timbre, envelope, frequency content). Write a Web Audio API function body to synthesize a similar sound procedurally."
          }
        ]
      },
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                code: { type: Type.STRING },
                explanation: { type: Type.STRING },
                soundDescription: { type: Type.STRING }
            },
            required: ["code", "explanation", "soundDescription"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text) as GeneratedCode;

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const generateSynthCodeFromText = async (description: string, currentParams?: any): Promise<GeneratedCode> => {
  const systemInstruction = `
    You are an expert Web Audio API Developer.
    Return ONLY valid JSON. Structure:
    {
        "code": "function body string (no signature)",
        "explanation": "concise technical summary",
        "soundDescription": "short creative name"
    }
    The code is the BODY of: function playEffect(ctx, destination) { ... }
    Use 'ctx' (AudioContext), connect to 'destination'. Clean up nodes using stop() or garbage collection.
  `;

  try {
     const response = await ai.models.generateContent({
       model: MODEL_ID,
       contents: `Generate Web Audio API code to create this sound: "${description}". 
       Consider manual synth settings if relevant: ${currentParams ? JSON.stringify(currentParams) : 'none'}`,
       config: {
         systemInstruction: systemInstruction,
         responseMimeType: "application/json",
         responseSchema: {
            type: Type.OBJECT,
            properties: {
                code: { type: Type.STRING },
                explanation: { type: Type.STRING },
                soundDescription: { type: Type.STRING }
            },
            required: ["code", "explanation", "soundDescription"]
         }
       }
     });
     
     const text = response.text;
     if (!text) throw new Error("No response from AI");
     return JSON.parse(text) as GeneratedCode;
   } catch (error) {
     console.error("Text Gen Error:", error);
     throw error;
   }
};

export const refineCodeWithPrompt = async (currentCode: string, userInstruction: string): Promise<GeneratedCode> => {
   const prompt = `
     Here is an existing Web Audio API code snippet (body only):
     \`\`\`javascript
     ${currentCode}
     \`\`\`
     
     The user wants to modify it: "${userInstruction}".
     
     Return the updated JSON with 'code' and 'explanation'. Ensure the code is still the BODY of the function.
   `;

   try {
     const response = await ai.models.generateContent({
       model: MODEL_ID,
       contents: prompt,
       config: {
         responseMimeType: "application/json",
         responseSchema: {
            type: Type.OBJECT,
            properties: {
                code: { type: Type.STRING },
                explanation: { type: Type.STRING }
            }
         }
       }
     });
     
     const text = response.text;
     if (!text) throw new Error("No response from AI");
     return JSON.parse(text) as GeneratedCode;
   } catch (error) {
     console.error("Refine Error:", error);
     throw error;
   }
};