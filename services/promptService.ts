
import { GoogleGenAI } from "@google/genai";
import { PromptConfig } from "../types";

// 将来的な拡張を見越してモデルリストを定数化
export const ENHANCER_MODELS = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Fast)' },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
  // 将来的に gemini-pro 等を追加可能
];

// Default Meta-Prompt (System Instruction)
// Updated to "Sora 2 Expert" per user request
export const DEFAULT_BASE_SYSTEM_PROMPT = `あなたはSora 2の動画生成エキスパートです。
提供される [CONFIGURATION PARAMETERS] (言語、JSON形式の指定など) を**厳密に参照し**、それに基づいてSora 2向けの動画生成プロンプトを作成してください。

### 基本ルール:
- プロンプトは [CONFIGURATION PARAMETERS] で指定された言語で記述し、詳細で視覚的に豊かで、10秒または15秒程度の動画を想定。
- アクションを明確にし、カメラ移動（panning, zooming）、タイミング、スタイルを追加してダイナミックにする。
- [CONFIGURATION PARAMETERS] でJSON形式が指定されていない場合、通常のテキストプロンプトを作成。
- [CONFIGURATION PARAMETERS] でJSON形式が指定された場合、Sora 2のJSONプロンプト形式（タイムコントロール付き）で作成。構造は以下の通り:
  {
    "prompt": "全体のベースプロンプト",
    "timeline": [
      {"start": 0, "end": 3, "description": "シーンの詳細"},
      {"start": 3, "end": 10, "description": "次のシーンの詳細"}
    ],
    "style": "オプションのスタイル指定",
    "camera": "オプションのカメラ指示"
  }
- 創造性を促す言葉（例: "be super creative"）を適宜追加。
- 出力はプロンプトのみ。説明は不要。

今すぐ生成を開始してください。`;

// Internal Protocol to enforce settings regardless of user meta-prompt
// This is appended to ensure the LLM looks at the config block we generate.
export const SYSTEM_PROTOCOL_ENFORCEMENT = `
### CRITICAL SYSTEM PROTOCOL (OVERRIDE)
You must strictly adhere to the following constraints provided in the [CONFIGURATION PARAMETERS] block:
1. **Language**: Output MUST be in the language specified in TARGET_LANGUAGE. If 'NO_ENFORCEMENT', you may choose.
2. **JSON Format**: If TIMING_CONTROL is 'JSON_FORMAT', output valid JSON. If 'STANDARD_DESCRIPTIVE', output plain text.
3. **Audio/Text**: Respect the audio and text overlay flags.

Output ONLY the final result. No markdown conversational filler.
`;

// Helper to construct the parameter block (Exported for Director Mode)
export const constructParamBlock = (config: PromptConfig): string => {
  let langStr = 'AUTO_DETECT (No specific enforcement)';
  switch(config.language) {
    case 'ja': langStr = 'Japanese (日本語)'; break;
    case 'en': langStr = 'English (英語)'; break;
    case 'ko': langStr = 'Korean (韓国語)'; break;
    case 'zh-CN': langStr = 'Simplified Chinese (中国語 簡体字)'; break;
    case 'zh-TW': langStr = 'Traditional Chinese (中国語 繁体字)'; break;
    case 'none': langStr = 'NO_ENFORCEMENT (Allow mixed or any language)'; break;
  }

  return [
    `TARGET_LANGUAGE: ${langStr}`,
    `AUDIO_MODE: ${config.audioMode.toUpperCase()} (${config.audioMode === 'off' ? 'Silent video (No Sound)' : config.audioMode === 'dialogue' ? 'Include NATURAL SPOKEN DIALOGUE between characters' : 'Include PROFESSIONAL NARRATION/VOICEOVER'})`,
    `TEXT_OVERLAYS: ${config.enableText ? 'REQUIRED (Include visual text descriptions / Subtitles)' : 'FORBIDDEN (Clean feed, no text)'}`,
    `TIMING_CONTROL: ${config.enableJsonTiming ? 'JSON_FORMAT (Use explicit timing objects)' : 'STANDARD_DESCRIPTIVE'}`,
    config.imageReferenceMode 
      ? `IMAGE_STRATEGY: ${config.imageReferenceMode === 'animate' ? 'ANIMATE_EXISTING_IMAGE (Keep composition, add motion)' : 'SUBJECT_REFERENCE (Use subject in NEW context)'}` 
      : 'IMAGE_STRATEGY: TEXT_TO_VIDEO (No reference image)'
  ].join('\n');
};

export const generateEnhancedPrompt = async (
  apiKey: string,
  draftIdea: string,
  config: PromptConfig,
  modelId: string = 'gemini-2.5-flash',
  baseSystemPrompt: string = DEFAULT_BASE_SYSTEM_PROMPT
): Promise<string> => {
  
  // Use the provided user API key
  const ai = new GoogleGenAI({ apiKey });

  // 1. Construct a Structured Parameter Block
  const paramBlock = constructParamBlock(config);

  // 2. Construct the User Content
  // We separate the Config from the Draft Idea clearly.
  const combinedUserContent = `
[CONFIGURATION PARAMETERS]
${paramBlock}

[DRAFT IDEA]
"${draftIdea}"

Based on the [CONFIGURATION PARAMETERS] and your Persona, rewrite the [DRAFT IDEA] into a high-fidelity video generation prompt.
  `;

  // 3. Combine System Instructions
  // We append the enforcement protocol to the user's custom meta-prompt to ensure functional requirements are met.
  const fullSystemInstruction = `${baseSystemPrompt}\n\n${SYSTEM_PROTOCOL_ENFORCEMENT}`;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: combinedUserContent,
      config: {
        systemInstruction: fullSystemInstruction,
        // We do not use JSON schema here as the output is a prompt string
      }
    });

    const output = response.text?.trim();
    
    if (!output) {
        throw new Error("Empty response from AI model");
    }

    return output;
  } catch (error: any) {
    console.error("Prompt Enhancement Failed:", error);
    throw new Error(`Failed to enhance prompt: ${error.message}`);
  }
};