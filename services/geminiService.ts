
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from "../types";

export const analyzeClassroomFrames = async (base64Frames: string[]): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const imageParts = base64Frames.map(data => ({
    inlineData: {
      data,
      mimeType: 'image/jpeg'
    }
  }));

  const prompt = `Analyze these frames from a 10-second classroom video. 
  1. Count the exact number of unique people (students and teacher) visible across these frames.
  2. Provide a brief description of the classroom setting and activity.
  3. List key visual features detected (e.g., "sitting at desks", "raising hands", "whiteboard visible").
  
  Be as accurate as possible with the head count.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        ...imageParts,
        { text: prompt }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          personCount: {
            type: Type.NUMBER,
            description: 'The total number of people detected.'
          },
          confidence: {
            type: Type.NUMBER,
            description: 'Confidence score between 0 and 1.'
          },
          description: {
            type: Type.STRING,
            description: 'A summary of the visual analysis.'
          },
          detectedFeatures: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'List of specific visual cues observed.'
          }
        },
        required: ['personCount', 'confidence', 'description', 'detectedFeatures']
      }
    }
  });

  const resultStr = response.text || "{}";
  return JSON.parse(resultStr) as AnalysisResult;
};
