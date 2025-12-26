
import { GoogleGenAI, Type } from "@google/genai";
import { WordPair } from "../types";

// Always initialize GoogleGenAI inside the function or right before use to ensure the latest API key is used.
export async function fetchWordPairs(count: number = 10): Promise<WordPair[]> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate ${count} pairs of words for the game 'Who is the Spy' (also known as Undercover). 
      Each pair should have two similar but distinct objects, concepts, or entities. 
      Words should be in English. 
      Ensure they are common enough for people to know but tricky enough to differentiate.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              civilian: { type: Type.STRING, description: "The word for majority players" },
              spy: { type: Type.STRING, description: "The word for the spy" }
            },
            required: ["civilian", "spy"]
          }
        }
      }
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text) as WordPair[];
  } catch (error) {
    console.error("Error fetching word pairs from Gemini:", error);
    // Fallback word list if API fails
    return [
      { civilian: "Mountain", spy: "Hill" },
      { civilian: "Bicycle", spy: "Motorcycle" },
      { civilian: "Milk", spy: "Soy Milk" },
      { civilian: "Pen", spy: "Pencil" },
      { civilian: "Star", spy: "Planet" }
    ];
  }
}
