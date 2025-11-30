import { GoogleGenAI, Type } from "@google/genai";
import { ArticleBlock, BlockType, ImageResolution, ImageGenAspectRatio, ImageModelType, GeneratedArticle, SearchSource } from "../types";

// Helper interface for the global aistudio object
// Defined locally to avoid global namespace conflicts
interface AIStudioClient {
  hasSelectedApiKey: () => Promise<boolean>;
  openSelectKey: () => Promise<void>;
}

const processTextWithGemini = async (rawText: string): Promise<ArticleBlock[]> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Schema definition for structured output
  const responseSchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        type: {
          type: Type.STRING,
          enum: [
            BlockType.TITLE,
            BlockType.HEADING,
            BlockType.SUBHEADING,
            BlockType.PARAGRAPH,
            BlockType.QUOTE,
            BlockType.LIST_ITEM,
            BlockType.IMAGE_PLACEHOLDER
          ],
          description: "The type of the content block.",
        },
        content: {
          type: Type.STRING,
          description: "The text content.",
        },
        isEmphasis: {
          type: Type.BOOLEAN,
          description: "Very rarely true. Only for definitions or critical warnings.",
        },
        isGoldenQuote: {
          type: Type.BOOLEAN,
          description: "True ONLY for famous quotes. Max 1 per article.",
        },
      },
      required: ["type", "content"],
    },
  };

  const prompt = `
    You are an expert WeChat Official Account (公众号) editor. 
    Analyze the following raw text and structure it into a JSON array for rendering.
    
    STRICT RULES FOR OUTPUT:
    1. **Formatting Noise**: Do NOT overuse bold text (isEmphasis). 99% of paragraphs should have NO emphasis. Only bold a sentence if it is a crucial definition.
    2. **Quotes**: Do NOT use "Golden Quotes" (isGoldenQuote) unless it is a literal quote from a famous person. Do not turn summary sentences into quotes.
    3. **Logic & Lists**: If the text contains steps, lists, or arguments, PREFER converting them into 'list_item' blocks with explicit numbering (1., 2., 3.) in the content string. This improves logical clarity.
    4. **Spacing**: Keep paragraphs moderate in length. If a paragraph is huge, split it.
    5. **Images**: If you see "[IMG-x]", mark as 'image_placeholder'.
    6. **Headings**: Identify H1 (Title), H2 (Heading), H3 (Subheading) correctly.

    Raw Text:
    ${rawText}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.2, // Low temp for strict adherence to formatting rules
      },
    });

    const text = response.text;
    if (!text) return [];
    
    return JSON.parse(text) as ArticleBlock[];
  } catch (error) {
    console.error("Gemini processing error:", error);
    throw error;
  }
};

const generateImageFromPrompt = async (
  prompt: string, 
  size: ImageResolution, 
  aspectRatio: ImageGenAspectRatio,
  modelType: ImageModelType
): Promise<string | null> => {
  
  // 1. Handle Paid API Key Selection for Pro models
  const win = window as unknown as { aistudio?: AIStudioClient };
  
  if (modelType === 'pro' && win.aistudio && win.aistudio.hasSelectedApiKey) {
    const hasKey = await win.aistudio.hasSelectedApiKey();
    if (!hasKey) {
      await win.aistudio.openSelectKey();
    }
  }

  // 2. Initialize API Client
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing.");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    let response;

    if (modelType === 'pro') {
      response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
          parts: [{ text: prompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio,
            imageSize: size,
          },
        },
      });
    } else {
      response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image', 
        contents: {
          parts: [{ text: prompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio,
          },
        },
      });
    }

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        const base64EncodeString = part.inlineData.data;
        return `data:image/png;base64,${base64EncodeString}`;
      }
    }
    
    return null;
  } catch (error) {
    console.error("Image generation error:", error);
    throw error;
  }
};

const generateArticleWithSearch = async (
  topic: string,
  context: string,
  useSearch: boolean
): Promise<GeneratedArticle> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const systemInstruction = `
    You are a professional, senior writer for a WeChat Official Account.
    Your writing style is calm, logical, and insightful. 
    
    CRITICAL ANTI-AI INSTRUCTIONS:
    1. **NO CLICHES**: Never use "In conclusion" (综上所述), "It is worth noting" (值得注意的是), "In today's era" (在当今时代).
    2. **LOGIC**: Use NUMBERED LISTS (1., 2., 3.) for all key arguments. This is mandatory.
    3. **SPACING**: Do not output huge walls of text. Break sections clearly.
    4. **TONE**: Be direct. Don't be overly enthusiastic. Be helpful and objective.
  `;

  const prompt = `
    Topic: ${topic}
    Context: ${context}
    
    Task: Write a high-quality article.
    ${useSearch ? 'Tool: Use Google Search for facts.' : ''}
    
    Structure Requirement:
    - Title: Catchy but professional.
    - Intro: Brief, hook the reader.
    - Body: 3-4 Main Sections. Each section MUST use numbered lists (1, 2, 3) to explain details.
    - Conclusion: Short, punchy summary.
    
    Make it ready for a mobile reading experience.
  `;

  try {
    const config: any = {
      systemInstruction: systemInstruction,
      temperature: 0.5,
    };

    if (useSearch) {
      config.tools = [{ googleSearch: {} }];
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: config,
    });

    const text = response.text || "";
    const sources: SearchSource[] = [];
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    groundingChunks.forEach((chunk: any) => {
      if (chunk.web) {
        sources.push({
          title: chunk.web.title || "Source",
          uri: chunk.web.uri,
        });
      }
    });

    let title = "New Article";
    let content = text;
    
    const lines = text.split('\n');
    // Try to find a markdown title
    const titleLine = lines.find(l => l.trim().startsWith('# '));
    if (titleLine) {
      title = titleLine.replace('# ', '').trim();
      // Remove the title from content if it's at the very top to avoid duplication
      if (lines[0] === titleLine) {
         content = lines.slice(1).join('\n').trim();
      }
    } else if (lines[0] && lines[0].length < 100) {
      title = lines[0].trim();
    }

    return {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      title,
      content,
      sources
    };

  } catch (error) {
    console.error("Article generation error:", error);
    throw error;
  }
};

export { processTextWithGemini, generateImageFromPrompt, generateArticleWithSearch };
