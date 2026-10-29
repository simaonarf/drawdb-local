import {
    CreateWebWorkerMLCEngine, prebuiltAppConfig, type AppConfig, type InitProgressReport, type MLCEngineInterface,
} from "@mlc-ai/web-llm";

let engine: MLCEngineInterface | null = null;
let loading: Promise<MLCEngineInterface> | null = null;
let currentModel: string | null = null;

const ALLOWED_MODELS = [
    { id: "Llama-3.2-1B-Instruct-q4f16_1-MLC", label: "Llama 3.2 1B q4f16_1" },
    { id: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC", label: "Qwen2.5 1,5B q4f16_1" },
    { id: "Llama-3.2-3B-Instruct-q4f16_1-MLC", label: "Llama 3.2 3B q4f16_1" },
    { id: "Qwen2.5-3B-Instruct-q4f16_1-MLC", label: "Qwen2.5 3B q4f16_1" },
    { id: "Phi-3.5-mini-instruct-q4f16_1-MLC", label: "Phi-3.5 3,8B q4f16_1" },
    { id: "Llama-3.1-8B-Instruct-q4f16_1-MLC", label: "Llama 3.1 8B q4f16_1" },
    { id: "Qwen2.5-7B-Instruct-q4f16_1-MLC", label: "Qwen2.5 7B q4f16_1" },
];

const allowedIds = new Set(ALLOWED_MODELS.map((m) => m.id));

const appConfig: AppConfig = {
    ...prebuiltAppConfig,
    model_list: prebuiltAppConfig.model_list.filter((m) =>
        allowedIds.has(m.model_id),
    ),
    cacheBackend: "indexeddb",
};

export function listModels() {
    const available = new Set(appConfig.model_list.map((m) => m.model_id));

    ALLOWED_MODELS.forEach((m) => {
        if (!available.has(m.id)) {
            console.warn(`[WebLLM] Modelo não encontrado no registro: ${m.id}`);
        }
    });

    return ALLOWED_MODELS.filter((m) => available.has(m.id));
}

export async function loadModel(
    modelId: string,
    onProgress?: (p: InitProgressReport) => void,
) {
    if (engine && currentModel === modelId) return engine;

    if (loading) return loading;

    loading = (async () => {
        if (engine) {
            engine.setInitProgressCallback(onProgress ?? (() => { }));
            await engine.reload(modelId);
        } else {
            engine = await CreateWebWorkerMLCEngine(
                new Worker(new URL("./worker.ts", import.meta.url), { type: "module" }),
                modelId,
                { appConfig, initProgressCallback: onProgress },
            );
        }
        currentModel = modelId;
        return engine;
    })();

    try {
        return await loading;
    } finally {
        loading = null;
    }
}

export async function* streamChat(
    messages: { role: "system" | "user" | "assistant"; content: string }[],
    onMetrics?: (tokens: number, speed: number | null) => void,
) {
    if (!engine) throw new Error("Modelo não carregado. Chame loadModel() antes.");

    const chunks = await engine.chat.completions.create({
        messages,
        stream: true,
        temperature: 0.2,
        stream_options: { include_usage: true },
    });

    for await (const chunk of chunks) {
        if (chunk.usage) {
            const tokens = chunk.usage.completion_tokens;
            const speed = chunk.usage.extra?.decode_tokens_per_s ?? null;

            onMetrics?.(tokens, speed);
        }
        yield chunk.choices[0]?.delta.content ?? "";
    }
}

export async function unloadModel() {
    await engine?.unload();
    engine = null;
    currentModel = null;
}