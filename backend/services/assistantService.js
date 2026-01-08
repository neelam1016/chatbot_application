import crypto from "node:crypto";
import https from "node:https";
import { URL } from "node:url";
import { User } from "../models/userModel.js";

const getAssistantConfig = () => ({
    name: process.env.AI_ASSISTANT_NAME || "AI Assistant",
    email: process.env.AI_ASSISTANT_EMAIL || "assistant@chat.local",
    pic:
        process.env.AI_ASSISTANT_PIC ||
        "https://icon-library.com/images/assistant-avatar-icon/assistant-avatar-icon-24.jpg",
    password: process.env.AI_ASSISTANT_PASSWORD || crypto.randomBytes(24).toString("hex"),
});

const toNumber = (value, fallback) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const getProvider = () => {
    const raw = (process.env.AI_PROVIDER || "").trim().toLowerCase();
    if (raw) return raw;
    if (process.env.GEMINI_API_KEY) return "gemini";
    return "openai";
};

const postJson = (url, payload, headers = {}) => {
    if (typeof fetch === "function") {
        return fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...headers },
            body: JSON.stringify(payload),
        }).then(async (response) => {
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                const message = data?.error?.message || `AI request failed with status ${response.status}`;
                const error = new Error(message);
                error.status = response.status;
                error.payload = data;
                throw error;
            }
            return data;
        });
    }

    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const body = JSON.stringify(payload);
        const req = https.request(
            {
                method: "POST",
                hostname: urlObj.hostname,
                path: `${urlObj.pathname}${urlObj.search}`,
                headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body), ...headers },
            },
            (res) => {
                let raw = "";
                res.on("data", (chunk) => {
                    raw += chunk;
                });
                res.on("end", () => {
                    let data = {};
                    if (raw) {
                        try {
                            data = JSON.parse(raw);
                        } catch (err) {
                            return reject(new Error("AI response was not valid JSON"));
                        }
                    }
                    if (res.statusCode && res.statusCode >= 400) {
                        const message = data?.error?.message || `AI request failed with status ${res.statusCode}`;
                        const error = new Error(message);
                        error.status = res.statusCode;
                        error.payload = data;
                        return reject(error);
                    }
                    resolve(data);
                });
            }
        );
        req.on("error", reject);
        req.write(body);
        req.end();
    });
};

const buildGeminiPayload = ({ messages, temperature, maxTokens }) => {
    const contents = [];
    const systemParts = [];

    (messages || []).forEach((message) => {
        const content = (message?.content || "").trim();
        if (!content) return;
        if (message.role === "system") {
            systemParts.push(content);
            return;
        }
        const role = message.role === "assistant" ? "model" : "user";
        contents.push({ role, parts: [{ text: content }] });
    });

    const payload = { contents };
    if (systemParts.length) {
        payload.systemInstruction = {
            role: "system",
            parts: [{ text: systemParts.join("\n") }],
        };
    }

    const generationConfig = {};
    if (Number.isFinite(temperature)) generationConfig.temperature = temperature;
    if (Number.isFinite(maxTokens)) generationConfig.maxOutputTokens = maxTokens;
    if (Object.keys(generationConfig).length) payload.generationConfig = generationConfig;

    return payload;
};

const extractGeminiContent = (data) => {
    console.log("Gemini response data:", data?.candidates?.[0]?.content?.parts);
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const text = parts.map((part) => part?.text || "").join("").trim();
    return text;
};

export const ensureAssistantUser = async () => {
    const config = getAssistantConfig();
    let assistant = await User.findOne({ isAssistant: true });
    if (!assistant) {
        assistant = await User.findOne({ email: config.email });
    }
    if (!assistant) {
        assistant = await User.create({
            name: config.name,
            email: config.email,
            password: config.password,
            pic: config.pic,
            isAssistant: true,
        });
        return assistant;
    }

    let changed = false;
    if (!assistant.isAssistant) {
        assistant.isAssistant = true;
        changed = true;
    }
    if (!assistant.name) {
        assistant.name = config.name;
        changed = true;
    }
    if (!assistant.pic) {
        assistant.pic = config.pic;
        changed = true;
    }
    if (changed) {
        await assistant.save();
    }
    return assistant;
};

export const getAssistantUser = async () => {
    const existing = await User.findOne({ isAssistant: true });
    if (existing) return existing;
    return ensureAssistantUser();
};

export const buildAssistantMessages = ({ history, assistantId, prompt }) => {
    const systemPrompt =
        process.env.AI_ASSISTANT_SYSTEM_PROMPT ||
        "You are a helpful assistant inside a chat application. Keep responses concise and friendly.";
    const messages = [];
    if (systemPrompt) {
        messages.push({ role: "system", content: systemPrompt });
    }

    (history || []).forEach((message) => {
        const content = (message?.content || "").trim();
        if (!content) return;
        const senderId = message?.sender;
        const role = senderId && String(senderId) === String(assistantId) ? "assistant" : "user";
        messages.push({ role, content });
    });

    const cleanedPrompt = (prompt || "").trim();
    const last = messages[messages.length - 1];
    if (cleanedPrompt && (!last || last.role !== "user" || last.content !== cleanedPrompt)) {
        messages.push({ role: "user", content: cleanedPrompt });
    }

    return messages;
};

export const generateAssistantReply = async ({ messages }) => {
    const provider = getProvider();
    const temperature = toNumber(process.env.AI_TEMPERATURE, 0.7);
    const maxTokens = toNumber(process.env.AI_MAX_TOKENS, 300);

    if (provider === "gemini") {
        const apiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY;
        console.log("Gemini API Key:", apiKey ? "****" + apiKey.slice(-4) : "none");
        if (!apiKey) {
            return {
                content: "AI assistant is not configured. Add GEMINI_API_KEY to the backend environment.",
                error: "missing_api_key",
            };
        }

        const baseUrl = process.env.GEMINI_BASE_URL || process.env.AI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta";
        const model = process.env.GEMINI_MODEL || process.env.AI_MODEL || "gemini-1.5-flash";
        const url = new URL(`models/${model}:generateContent`, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
        url.searchParams.set("key", apiKey);
        const payload = buildGeminiPayload({ messages, temperature, maxTokens });

        try {
            const data = await postJson(url.toString(), payload);
            console.log("Gemini response data:", data);
            const content = extractGeminiContent(data);
            if (!content) {
                return { content: "AI assistant returned an empty response.", error: "empty_response" };
            }
            return { content };
        } catch (error) {
            console.error("Gemini API error:", error);
            return {
                content: "AI assistant request failed. Check server logs and API settings.",
                error: error?.message || "request_failed",
            };
        }
    }

    const apiKey = process.env.OPENAI_API_KEY || process.env.AI_API_KEY;
    console.log("OpenAI API Key:", apiKey ? "****" + apiKey.slice(-4) : "none");
    if (!apiKey) {
        return {
            content: "AI assistant is not configured. Add AI_API_KEY to the backend environment.",
            error: "missing_api_key",
        };
    }

    const baseUrl = process.env.AI_BASE_URL || "https://api.openai.com/v1";
    const model = process.env.AI_MODEL || "gpt-4o-mini";
    const url = new URL("chat/completions", baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`).toString();
    const payload = {
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
    };

    try {
        const data = await postJson(url, payload, { Authorization: `Bearer ${apiKey}` });
        const content = data?.choices?.[0]?.message?.content?.trim();
        if (!content) {
            return { content: "AI assistant returned an empty response.", error: "empty_response" };
        }
        return { content };
    } catch (error) {
        console.error("OpenAI API error:", error);
        return {
            content: "AI assistant request failed. Check server logs and API settings.",
            error: error?.message || "request_failed",
        };
    }
};
