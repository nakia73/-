
import { GoogleGenAI, Type } from "@google/genai";
import { DirectorScene } from "../types";

export const generateScenePlan = async (
  apiKey: string,
  idea: string,
  count: number,
  systemPrompt?: string // Custom Director Persona
): Promise<DirectorScene[]> => {
  
  // Use the provided user API key
  const ai = new GoogleGenAI({ apiKey });

  // Use custom prompt if provided, otherwise fallback (though App should provide default)
  const baseInstruction = systemPrompt || `You are an expert Film Director.`;
  
  const formatInstruction = `
    Your task is to take a user's abstract video idea and break it down into ${count} distinct, visually compelling scenes.
    Return the response in pure JSON format containing an array of objects.
    Each object must have:
    - "sceneNumber": integer
    - "description": string (A short 1-sentence summary in the same language as the User's input Idea)
    - "prompt": string (The detailed English prompt for the AI Video Generator)
  `;

  const fullSystemInstruction = `${baseInstruction}\n\n${formatInstruction}`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: idea,
    config: {
      systemInstruction: fullSystemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            sceneNumber: { type: Type.INTEGER },
            description: { type: Type.STRING },
            prompt: { type: Type.STRING },
          },
          required: ["sceneNumber", "description", "prompt"],
        },
      },
    }
  });

  let text = response.text;
  if (!text) throw new Error("No plan generated");

  // Clean up markdown if present
  if (text.includes('```')) {
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
  }

  try {
    const data = JSON.parse(text);
    const scenes = Array.isArray(data) ? data : data.scenes || [];
    
    return scenes.map((s: any) => ({
      id: crypto.randomUUID(),
      sceneNumber: s.sceneNumber,
      description: s.description,
      prompt: s.prompt
    }));
  } catch (e) {
    console.error("Failed to parse plan JSON", e, text);
    throw new Error("AI generated invalid plan format");
  }
};
