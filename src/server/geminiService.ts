import { GoogleGenAI } from '@google/genai';

// Initialize Gemini client on server with required User-Agent
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export interface FaceAnalysisResult {
  faceDetected: boolean;
  expression: string;
  lightingAngle: string;
  faceShape: string;
  historicalArchetype: string;
  recommendedEras: string[];
  historicalBackstory: string;
  costumeDetails: string;
  vintagePaletteRecommendation: string;
}

export async function analyzeFace(imageBase64: string, mimeType = 'image/jpeg'): Promise<FaceAnalysisResult> {
  const ai = getGeminiClient();
  
  if (!ai) {
    return {
      faceDetected: true,
      expression: 'Intrigued and poised',
      lightingAngle: 'Soft ambient front light',
      faceShape: 'Classic Oval',
      historicalArchetype: 'Court Scholar & Temporal Voyager',
      recommendedEras: ['Renaissance Florence', '1920s Speakeasy', 'Ancient Egypt'],
      historicalBackstory: 'Carries the contemplative gaze of a Renaissance philosopher mixed with the daring curiosity of a 1920s explorer.',
      costumeDetails: 'Crimson velvet doublet or tailored 1920s tuxedo jacket with brass chronometer chain.',
      vintagePaletteRecommendation: 'Warm chiaroscuro with antique sepia and burnished gold tones.'
    };
  }

  try {
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const prompt = `You are a vintage time-travel portrait historian and facial analysis expert for a retro photo booth.
Analyze this human face in the photo for historical portrait integration.
Return a clean, valid JSON object with the following fields:
{
  "faceDetected": true or false,
  "expression": "concise description of expression (e.g. Regal smile, pensive scholar, adventurous spark)",
  "lightingAngle": "direction and warmth of lighting on the face",
  "faceShape": "face structure (e.g. High cheekbones, chiseled jawline, soft oval)",
  "historicalArchetype": "a fitting historical role (e.g. Royal Astronomer of Alexandria, Venetian Merchant, Roaring 20s Jazz Virtuoso)",
  "recommendedEras": ["Top 3 historical eras that would look most stunning for this portrait"],
  "historicalBackstory": "A 2-sentence captivating lore description of this time-traveler's historical counterpart",
  "costumeDetails": "Specific garments and historical headwear/accessories that match this face and expression",
  "vintagePaletteRecommendation": "Color grading advice (e.g. Golden chiaroscuro, 1890s tintype silver, 1960s Kodachrome warm amber)"
}
Return ONLY valid JSON. No markdown blocks, no code fences.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType || 'image/jpeg',
              data: cleanBase64,
            },
          },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text?.trim() || '{}';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text);

    return {
      faceDetected: parsed.faceDetected ?? true,
      expression: parsed.expression ?? 'Poised and contemplative',
      lightingAngle: parsed.lightingAngle ?? 'Frontal natural light',
      faceShape: parsed.faceShape ?? 'Oval',
      historicalArchetype: parsed.historicalArchetype ?? 'Temporal Explorer',
      recommendedEras: Array.isArray(parsed.recommendedEras) ? parsed.recommendedEras : ['Renaissance Florence', '1920s Speakeasy', 'Ancient Egypt'],
      historicalBackstory: parsed.historicalBackstory ?? 'A traveler across centuries, blending seamlessly into historical portraiture.',
      costumeDetails: parsed.costumeDetails ?? 'Classic era-accurate attire with period accessories.',
      vintagePaletteRecommendation: parsed.vintagePaletteRecommendation ?? 'Warm vintage golden chiaroscuro.',
    };
  } catch (err: unknown) {
    console.error('Face analysis error:', err);
    return {
      faceDetected: true,
      expression: 'Thoughtful temporal voyager',
      lightingAngle: 'Warm ambient portrait light',
      faceShape: 'Noble portrait profile',
      historicalArchetype: 'Master Guild Artisan & Chrono Traveler',
      recommendedEras: ['Renaissance Florence', '1920s Speakeasy', 'Ancient Egypt', 'Victorian London'],
      historicalBackstory: 'The subject bears the unmistakable composure of an explorer who has witnessed the rise and fall of ancient empires.',
      costumeDetails: 'Embroidered silk collar with antique brass compass medallion.',
      vintagePaletteRecommendation: 'Rich amber oil glaze with deep charcoal shadows.',
    };
  }
}

export async function generateTimeTravelPortrait(
  userPhotoBase64: string,
  eraName: string,
  userPrompt: string
): Promise<{
  generatedImageBase64?: string;
  historicalContext: string;
  stylingTips: string;
}> {
  const ai = getGeminiClient();
  const cleanBase64 = userPhotoBase64.replace(/^data:image\/\w+;base64,/, '');

  let generatedImageBase64: string | undefined = undefined;

  // Attempt image generation if user configured a key with image generation capability
  if (ai) {
    try {
      const imgResponse = await ai.models.generateContent({
        model: 'gemini-nano-banana-2.1',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: cleanBase64,
              },
            },
            {
              text: `Historical time-travel portrait in the era of ${eraName}. Seamlessly integrate this person's facial features into an authentic, highly detailed period portrait. ${userPrompt}. Masterpiece, museum quality, historical lighting and textures.`,
            },
          ],
        },
        config: {
          imageConfig: {
            aspectRatio: '3:4',
            imageSize: '1K',
          },
        },
      });

      if (imgResponse.candidates?.[0]?.content?.parts) {
        for (const part of imgResponse.candidates[0].content.parts) {
          if (part.inlineData?.data) {
            generatedImageBase64 = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
            break;
          }
        }
      }
    } catch {
      // Graceful fallback to gemini-3.1-flash-lite-image or synthesis
      try {
        const fallbackImg = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite-image',
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: cleanBase64,
                },
              },
              {
                text: `Historical time-travel portrait in the era of ${eraName}. Period garments, authentic ambient lighting, museum oil painting aesthetic. ${userPrompt}`,
              },
            ],
          },
        });
        if (fallbackImg.candidates?.[0]?.content?.parts) {
          for (const part of fallbackImg.candidates[0].content.parts) {
            if (part.inlineData?.data) {
              generatedImageBase64 = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
              break;
            }
          }
        }
      } catch {
        // Model requires paid key or is restricted; we continue with prompt & lore generation
      }
    }
  }

  // Generate historical lore and styling tips
  let historicalContext = `Arriving in ${eraName}, you find yourself immersed in the distinctive customs, architecture, and atmosphere of the time.`;
  let stylingTips = 'Adjust face scale, rotation, and vintage film grain to blend harmoniously into the lighting.';

  if (ai) {
    try {
      const textResponse = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `You are an encyclopedia chronologist. Write two brief items for a traveler visiting ${eraName}:
1. "historicalContext": A vivid 2-sentence immersive description of what it feels like to stand in ${eraName} right now.
2. "stylingTips": 1 sentence describing the authentic fabric, posture, or lighting that characterizes portraiture in ${eraName}.
Return as valid JSON: {"historicalContext": "...", "stylingTips": "..."}`,
        config: {
          responseMimeType: 'application/json',
        },
      });
      const parsed = JSON.parse(textResponse.text || '{}');
      if (parsed.historicalContext) historicalContext = parsed.historicalContext;
      if (parsed.stylingTips) stylingTips = parsed.stylingTips;
    } catch (e) {
      console.error('Error generating historical context:', e);
    }
  }

  return {
    generatedImageBase64,
    historicalContext,
    stylingTips,
  };
}
