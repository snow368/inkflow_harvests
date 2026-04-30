import { toast } from "sonner";

// ========== API 池配置 ==========
import { toast } from "sonner";

// ========== API 池配置 ==========
const API_POOL = [
  {
    name: 'mistral',
    url: 'https://api.mistral.ai/v1/chat/completions',
    key: () => process.env.MISTRAL_API_KEY || '',
    buildRequest: (prompt: string) => ({
      model: 'mistral-small',
      messages: [
        { role: 'system', content: 'You are a helpful assistant that returns data in JSON format only. No markdown, no extra text.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 4000
    }),
    parseResponse: (data: any) => data?.choices?.[0]?.message?.content || '{}'
  },
  {
    name: 'deepseek',
    url: 'https://api.deepseek.com/chat/completions',
    key: () => process.env.DEEPSEEK_API_KEY || '',
    buildRequest: (prompt: string) => ({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: 'You are a helpful assistant that returns data in JSON format only. No markdown, no extra text.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 4000
    }),
    parseResponse: (data: any) => data?.choices?.[0]?.message?.content || '{}'
  },
  {
    name: 'gemini',
    url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
    key: () => process.env.GEMINI_API_KEY || '',
    buildRequest: (prompt: string) => ({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' }
    }),
    parseResponse: (data: any) => data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
  }
];
// ========== API 池配置结束 ==========

// ========== 带自动切换的调用函数 ==========
async function callWithFallback(prompt: string): Promise<any> {
  for (const api of API_POOL) {
    const apiKey = api.key();
    if (!apiKey) {
      console.warn(`⏭️ ${api.name} 未配置 Key，跳过`);
      continue;
    }

    try {
      const headers: any = { 'Content-Type': 'application/json' };
      if (api.name !== 'gemini') {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const url = api.name === 'gemini' ? `${api.url}?key=${apiKey}` : api.url;
      const body = api.buildRequest(prompt);

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(120000)
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(`${api.name} error: ${response.status} ${JSON.stringify(errData)}`);
      }

      const data = await response.json();
      const text = api.parseResponse(data);
      console.log(`✅ ${api.name} 调用成功`);
      return safeJsonParse(text, {});
    } catch (e: any) {
      console.warn(`⚠️ ${api.name} 失败: ${e.message}，尝试下一个...`);
    }
  }

  throw new Error('所有 API 均调用失败');
}
// ========== 自动切换函数结束 ==========

let isMockMode = false;

export const setMockMode = (mode: boolean) => {
  isMockMode = mode;
};

function getApiKey() {
  return process.env.GEMINI_API_KEY || "";
}

function handleGeminiError(error: any, silent: boolean = false) {
  console.error("Gemini API Error:", error);
  if (silent) return;
  
  const message = error?.message || String(error);
  if (message.includes("429") || message.includes("quota") || message.includes("limit")) {
    toast.error("⚠️ API Rate Limit Exceeded. Switching to Fast Import mode (No AI).");
  } else if (message.includes("Rpc failed") || message.includes("xhr error")) {
    toast.error("AI Network Error: The connection to Gemini was interrupted. Retrying might help.");
  } else {
    toast.error("An error occurred with the AI engine.");
  }
}

export function safeJsonParse(text: string, fallback: any) {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

export const processArtistBatchAI = async (
  artists: { id: string; username: string; shopName?: string; bio?: string }[],
  silent: boolean = false
): Promise<Record<string, any>> => {
  if (isMockMode) {
    // Mock 模式保持不变
    await new Promise(resolve => setTimeout(resolve, 1500));
    const mockResult: Record<string, any> = {};
    artists.forEach(a => {
      const postsPerWeek = Math.floor(Math.random() * 8) + 1;
      const avgLikes = Math.floor(Math.random() * 1200) + 80;
      const avgComments = Math.floor(Math.random() * 120) + 8;
      const followers = Math.floor(Math.random() * 20000) + 500;
      mockResult[a.id] = {
        followers,
        activityLevel: ['high', 'medium', 'low'][Math.floor(Math.random() * 3)],
        style: ['Realism', 'Traditional', 'Black & Grey', 'Fine Line'][Math.floor(Math.random() * 4)],
        dnaTags: ['#Verified', '#Active', '#ProArtist'],
        realUsername: a.username.includes('user_') || a.username.includes('shopify') ? `artist_${a.id.slice(-4)}` : a.username,
        realFullName: a.shopName || `Artist ${a.id.slice(-4)}`,
        postingHours: [11, 12, 13, 19, 20, 21].sort(() => 0.5 - Math.random()).slice(0, 3).sort((x, y) => x - y),
        postsPerWeek,
        avgLikes,
        avgComments,
        engagementRate: Number(((avgLikes + avgComments * 3) / Math.max(500, followers) * 100).toFixed(2)),
        followerFollowingRatio: Number((0.8 + Math.random() * 2.4).toFixed(2)),
        tattooLikelihood: Number((0.7 + Math.random() * 0.3).toFixed(2)),
        styleVector: {
          realism: Math.floor(Math.random() * 45),
          traditional: Math.floor(Math.random() * 45),
          black_grey: Math.floor(Math.random() * 45),
          fine_line: Math.floor(Math.random() * 45),
          blackwork: Math.floor(Math.random() * 45)
        }
      };
    });
    return mockResult;
  }

      try {
    const prompt = `Analyze these ${artists.length} tattoo artists for a tattoo supply business CRM. 
    For each artist, based on their handle (@${artists.map(a => a.username).join(', @')}) and shop name, provide realistic data:
    1. Follower count estimate: Generate a realistic number between 1,200 and 85,000 based on the handle's "vibe".
    2. Activity level: "high", "medium", or "low".
    3. Primary tattoo style: Be specific (e.g., "Micro-Realism", "American Traditional"). DO NOT use "Various".
    4. 3-5 professional DNA tags: (e.g. "#Realism", "#FineLine", "#ProTeam").
    5. A realistic Instagram handle: If the current one is a system ID (like user_123), suggest a professional one.
    6. The full shop or artist name: Clean up the provided name.
    7. Estimate active posting hours (0-23) as postingHours array (3-5 integers).
    8. Estimate postsPerWeek (integer), avgLikes (integer), avgComments (integer), engagementRate (percentage number).
    9. Estimate followerFollowingRatio (number), tattooLikelihood (0-1), and styleVector object with keys realism/traditional/black_grey/fine_line/blackwork.
    
    Artists to analyze:
    ${artists.map(a => `ID: ${a.id} | Handle: @${a.username} | Shop: ${a.shopName || 'N/A'} | Bio: ${a.bio || 'N/A'}`).join('\n')}
    
    CRITICAL: Return ONLY valid JSON object where keys are the IDs.`;

    return await callWithFallback(prompt);
  } catch (e: any) {
    handleGeminiError(e, silent);
    return {};
  }
};

export interface TrainingStatus {
  isTrained: boolean;
  lastTrained: string;
  dataPoints: number;
  accuracy: number;
}

export const getTrainingStatus = async (summary?: string): Promise<TrainingStatus> => {
  if (isMockMode) {
    return {
      isTrained: true,
      lastTrained: new Date().toISOString(),
      dataPoints: 1250,
      accuracy: 0.94
    };
  }
  // This would normally fetch from a database or state
  return {
    isTrained: false,
    lastTrained: "",
    dataPoints: 0,
    accuracy: 0
  };
};

export const identifyKnowledgeGaps = async (data: string): Promise<string[]> => {
  if (isMockMode) {
    await new Promise(resolve => setTimeout(resolve, 1500));
    return [
      "Missing pricing data for bulk needle orders",
      "No information on shipping to remote regions",
      "Lack of specific technical specs for the new rotary machine"
    ];
  }

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    const result = await model.generateContent(`Analyze the following business data and identify 3-5 critical knowledge gaps that would prevent an AI from effectively handling customer inquiries.
      
      Data: ${data.slice(0, 5000)}
      
      Return a JSON array of strings.`);

    const response = await result.response;
    const text = await response.text();
    return safeJsonParse(text || "", []);
  } catch (e) {
    handleGeminiError(e);
    return [];
  }
};

export const generateChatResponse = async (history: string, message: string, persona: string = 'professional'): Promise<string> => {
  if (isMockMode) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return "That's a great question! Our premium needles are designed for maximum precision and minimal trauma. Would you like to see our latest catalog?";
  }

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
    });

    const result = await model.generateContent(`You are an AI assistant for a tattoo supply company. 
      Persona: ${persona}
      Context/History: ${history}
      User Message: ${message}
      
      Provide a helpful and engaging response.`);

    const response = await result.response;
    return response.text() || "";
  } catch (e) {
    handleGeminiError(e);
    return "I'm sorry, I'm having trouble connecting to my brain right now.";
  }
};

export const suggestOutreachStrategy = async (location: string, artists: any[]): Promise<string> => {
  if (isMockMode) {
    return `Focus on the ${location} region. High-touch personalized outreach focusing on realism style. Suggest a sample pack of our 3RL liners to the top ${Math.min(artists.length, 5)} artists.`;
  }

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
    });

    const result = await model.generateContent(`Suggest an outreach strategy for these tattoo artists in ${location}:
      ${artists.slice(0, 5).map(a => `- ${a.fullName} (${a.style})`).join('\n')}
      
      Keep it to 2-3 sentences.`);

    const response = await result.response;
    return response.text() || "";
  } catch (e) {
    handleGeminiError(e);
    return "Focus on building relationships through social media engagement in this region.";
  }
};

export const generatePersonaDMScript = async (artistName: string, dnaTags: string[], persona: 'professional' | 'friendly'): Promise<string> => {
  if (isMockMode) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return `Hey ${artistName}! Love your ${dnaTags[0]} work. We have some new supplies that would fit your style perfectly.`;
  }

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
    });

    const result = await model.generateContent(`Generate a high-converting ${persona} DM script for a tattoo artist named ${artistName}. 
      Context: They specialize in ${dnaTags.join(', ')}. 
      Goal: Offer them a sample pack of premium tattoo supplies.
      Keep it short and personalized.`);

    const response = await result.response;
    return response.text() || "";
  } catch (e) {
    handleGeminiError(e);
    return "";
  }
};
