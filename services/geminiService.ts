
import { GoogleGenAI, Type } from "@google/genai";
import { WordPair } from "../types.ts";

const FALLBACK_WORDS: WordPair[] = [
  { civilian: "Mountain", spy: "Hill" },
  { civilian: "Bicycle", spy: "Motorcycle" },
  { civilian: "Milk", spy: "Soy Milk" },
  { civilian: "Pen", spy: "Pencil" },
  { civilian: "Star", spy: "Planet" },
  { civilian: "Laptop", spy: "Tablet" },
  { civilian: "Orange", spy: "Tangerine" },
  { civilian: "Taxi", spy: "Uber" },
  { civilian: "Soccer", spy: "Rugby" },
  { civilian: "Clock", spy: "Watch" }
];

function getSafeApiKey(): string {
  // @ts-ignore
  return window.process?.env?.API_KEY || "";
}

export async function fetchWordPairs(count: number = 10): Promise<WordPair[]> {
  const apiKey = getSafeApiKey();
  if (!apiKey) return FALLBACK_WORDS;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate ${count} pairs of words for the game 'Who is the Spy' (Undercover). Each pair should have two similar but distinct objects. Words should be in English.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              civilian: { type: Type.STRING },
              spy: { type: Type.STRING }
            },
            required: ["civilian", "spy"]
          }
        }
      }
    });

    const text = response.text;
    if (!text) return FALLBACK_WORDS;
    
    const parsed = JSON.parse(text) as WordPair[];
    return parsed.length > 0 ? parsed : FALLBACK_WORDS;
  } catch (error) {
    console.error("Error fetching word pairs:", error);
    return FALLBACK_WORDS;
  }
}
