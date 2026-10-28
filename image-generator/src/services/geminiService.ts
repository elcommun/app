
import { GoogleGenAI } from "@google/genai";

// APIキーはコードに書かず、使う人が画面で入力してこの端末のブラウザにだけ保存する
const API_KEY_STORAGE = 'ecImageGen_apiKey';

export const getApiKey = (): string => {
  try {
    return localStorage.getItem(API_KEY_STORAGE) || '';
  } catch {
    return '';
  }
};

export const setApiKey = (key: string) => {
  try {
    if (key) localStorage.setItem(API_KEY_STORAGE, key);
    else localStorage.removeItem(API_KEY_STORAGE);
  } catch (e) {
    console.warn('Failed to save API key:', e);
  }
};

// Helper to parse base64 string into API-compatible part
const getImagePart = (base64String: string) => {
  try {
    const parts = base64String.split(',');
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const data = parts[1];
    return {
      inlineData: {
        data,
        mimeType
      }
    };
  } catch (e) {
    console.warn("Invalid image data", e);
    return null;
  }
};

export async function generateImage(
  originalImages: string[],
  prompt: string,
  sketchData: string | null
): Promise<string[]> {
  // Instantiate GoogleGenAI here to ensure the most up-to-date API Key is used.
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Gemini APIキーが未設定です。右上の「APIキー」から入力してください。');
  }
  const ai = new GoogleGenAI({ apiKey });

  let contentsParts: any[] = [];
  let systemInstruction = `You are an expert AI specialized in Image Manipulation and Texture Replacement.`;

  // --- STRATEGY: INTERLEAVED PROMPTING ---
  // Instead of sending all images at once, we interleave text descriptions 
  // before each image to explicitly define its role to the model.

  if (originalImages.length >= 2) {
    // === MULTI-IMAGE MODE (ControlNet Logic) ===
    
    // 1. Add Base Image (Structure)
    contentsParts.push({ 
      text: "【IMAGE 1: LAYOUT & SHAPE REFERENCE】\nThis image defines the 3D geometry, perspective, folding, and lighting. \nINSTRUCTION: Keep this exact shape. Ignore its original surface design.\n" 
    });
    const basePart = getImagePart(originalImages[0]);
    if (basePart) contentsParts.push(basePart);

    // 2. Add Texture Images (Style)
    for (let i = 1; i < originalImages.length; i++) {
      contentsParts.push({ 
        text: `\n【IMAGE ${i + 1}: TEXTURE & STYLE SOURCE】\nThis image defines the colors, patterns, and graphics.\nINSTRUCTION: Use this design to cover the shape defined in Image 1.\n` 
      });
      const texPart = getImagePart(originalImages[i]);
      if (texPart) contentsParts.push(texPart);
    }

    // 3. Add Sketch (if exists)
    if (sketchData) {
      contentsParts.push({ text: "\n【SKETCH GUIDE】\nUse this sketch to refine specific contours or details.\n" });
      const sketchPart = getImagePart(sketchData);
      if (sketchPart) contentsParts.push(sketchPart);
    }

    // 4. Final Command
    const finalPrompt = prompt 
      ? `USER INSTRUCTION: ${prompt}\n\nSYSTEM JOB: Map the texture from the Texture Source images onto the exact geometry of Image 1. Do not change the camera angle or object placement.`
      : `SYSTEM JOB: Realistic Product Mockup. \nStep 1: Analyze the 3D shape of Image 1. \nStep 2: Analyze the pattern of Image 2. \nStep 3: Render Image 2's pattern wrapped onto Image 1's shape. \nMaintain photorealistic lighting.`;
    
    contentsParts.push({ text: finalPrompt });

    // Set a specialized system instruction for this mode
    systemInstruction = `
TASK: Texture Mapping / Product Mockup.
PRIORITY: 
1. GEOMETRY: Must match Image 1 exactly (100% fidelity to shape/folds).
2. APPEARANCE: Must match Image 2's design exactly.
Output is a photo-realistic composite.
`;

  } else {
    // === SINGLE IMAGE MODE ===
    
    // Add all available images
    for (const img of originalImages) {
      const p = getImagePart(img);
      if (p) contentsParts.push(p);
    }
    
    if (sketchData) {
      const p = getImagePart(sketchData);
      if (p) {
        contentsParts.push({ text: "Use the following sketch as a guide:" });
        contentsParts.push(p);
      }
    }

    contentsParts.push({ text: prompt || "Generate a high-quality image based on these inputs." });
  }

  // Number of variations to generate
  const GENERATION_COUNT = 3;
  
  // Create an array of promises to run in parallel
  const generatePromises = Array.from({ length: GENERATION_COUNT }).map(() => 
    ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: {
        parts: contentsParts
      },
      config: {
        systemInstruction: systemInstruction,
        imageConfig: {
            aspectRatio: "1:1", 
            imageSize: "1K"
        },
      }
    })
  );

  try {
    // Wait for all promises to settle
    const results = await Promise.allSettled(generatePromises);
    
    const generatedImages: string[] = [];

    // Process results
    for (const result of results) {
      if (result.status === 'fulfilled') {
        const response = result.value;
        if (response.candidates && response.candidates[0].content.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData && part.inlineData.data) {
                    const base64 = part.inlineData.data;
                    const mimeType = part.inlineData.mimeType || 'image/jpeg';
                    generatedImages.push(`data:${mimeType};base64,${base64}`);
                }
            }
        }
      } else {
        console.warn("One of the generation requests failed:", result.reason);
      }
    }

    if (generatedImages.length === 0) {
        const firstFailure = results.find(r => r.status === 'rejected') as PromiseRejectedResult;
        throw firstFailure ? firstFailure.reason : new Error("画像の生成に失敗しました。もう一度試してください。");
    }

    return generatedImages;

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
}
