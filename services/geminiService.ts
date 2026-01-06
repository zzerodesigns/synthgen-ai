import { GoogleGenAI, SchemaType, Type } from "@google/genai";
import { GeneratedCode } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateSynthCodeFromAudio = async (base64Audio: string, mimeType: string): Promise<GeneratedCode> => {
  const modelId = "gemini-3-pro-preview"; // Using pro for better coding capability

  const systemInstruction = `
    You are an expert Web Audio API and Audio Synthesis engineer.
    Your task is to analyze an audio file and write a JavaScript function to reproduce that sound procedurally using the Web Audio API.
    
    Requirements:
    1. The code MUST be a single function named 'playEffect(ctx, destination)'.
    2. 'ctx' is the AudioContext, 'destination' is the target node (like a Master Gain).
    3. Use ONLY standard Web Audio API nodes (OscillatorNode, GainNode, BiquadFilterNode, AudioBufferSourceNode for noise).
    4. DO NOT load external audio files. If noise is needed, generate a white/pink noise buffer programmatically within the function.
    5. Be precise with timing (envelopes) and frequency modulation to match the input sound's character (percussive, drone, chirp, etc.).
    6. Return the response in JSON format containing the code string and a brief explanation.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Audio,
            },
          },
          {
            text: "Analyze this sound and write the Web Audio API code to synthesize it."
          }
        ]
      },
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                code: {
                    type: Type.STRING,
                    description: "The JavaScript code for the playEffect function."
                },
                explanation: {
                    type: Type.STRING,
                    description: "A brief technical explanation of the synthesis approach."
                }
            },
            required: ["code", "explanation"]
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

export const refineCodeWithPrompt = async (currentCode: string, userInstruction: string): Promise<GeneratedCode> => {
   const modelId = "gemini-3-pro-preview";
   
   const prompt = `
     Here is an existing Web Audio API code snippet:
     \`\`\`javascript
     ${currentCode}
     \`\`\`
     
     The user wants to modify it: "${userInstruction}".
     
     Return the updated JSON with 'code' and 'explanation'. Ensure the function signature 'playEffect(ctx, destination)' remains.
   `;

   try {
     const response = await ai.models.generateContent({
       model: modelId,
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
