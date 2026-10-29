import { useState, useRef } from "react";
import { loadModel, streamChat, listModels } from "../services/webllm/engine";

export default function WebLLM() {
  const [isOpen, setIsOpen] = useState(false);
  const [model, setModel] = useState("");
  const [status, setStatus] = useState("");
  const [prompt, setPrompt] = useState("");
  const [output, setOutput] = useState("");

  const results = useRef([]);

  const handleLoad = async () => {
    const start = performance.now();

    try {
      await loadModel(model, (p) => setStatus(p.text));

      const end = performance.now();
      const time = (end - start) / 1000;

      console.log(`[WebLLM] carregamento: ${time.toFixed(2)} s`);
      setStatus("Modelo carregado.");
    } catch (e) {
      setStatus("Erro: " + e.message);
    }
  };

  const handleSend = async () => {
    if (!prompt.trim()) return;

    setOutput("");

    const start = performance.now();

    let firstToken = null;
    let tokens = null;
    let speed = null;

    try {
      for await (const chunk of streamChat(
        [{ role: "user", content: prompt }],
        (total, tokenSpeed) => {
          tokens = total;
          speed = tokenSpeed;
        },
      )) {
        if (chunk && firstToken === null) {
          firstToken = performance.now();
        }

        setOutput((prev) => prev + chunk);
      }

      const end = performance.now();

      const result = {
        model: model,
        prompt: prompt,
        totalLatency: Number(((end - start) / 1000).toFixed(2)),
        timeToFirstToken:
          firstToken === null
            ? null
            : Number(((firstToken - start) / 1000).toFixed(2)),
        generationSpeed: speed,
        generatedTokens: tokens,
      };

      results.current.push(result);

      console.table(results.current);
    } catch (error) {
      console.error("[WebLLM] Erro na geração:", error);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-[9999] w-80 bg-gray-200/75 shadow-lg backdrop-blur-md text-slate-700 p-4 rounded-2xl border border-gray-300 space-y-3 font-sans mb-14">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-700">
          WebLLM Chat
        </span>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-slate-600 hover:text-slate-900 text-lg font-semibold px-1.5 py-0.5 rounded transition"
        >
          {isOpen ? "−" : "+"}
        </button>
      </div>

      {isOpen && (
        <>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full bg-white opacity-60 shadow-lg text-xs font-medium text-slate-900 rounded-lg px-2.5 py-2 transition"
          >
            <option value="">Escolha um modelo</option>
            {listModels().map(({ id, label }) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>

          <button
            onClick={handleLoad}
            disabled={!model}
            className="w-full bg-blue-600 hover:bg-blue-500 active:scale-[0.99] text-white py-2 text-xs font-semibold rounded-lg disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-blue-600 transition shadow-sm"
          >
            Carregar
          </button>

          {status && (
            <div className="text-[11px] font-medium text-slate-900 px-1 truncate">
              {status}
            </div>
          )}

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Diga olá"
            rows={2}
            className="w-full bg-white opacity-60 shadow-lg text-xs text-slate-900 rounded-lg p-2.5 transition resize-none placeholder:text-slate-900"
          />

          <button
            onClick={handleSend}
            className="w-full bg-slate-50 text-slate-900 py-2 text-xs font-semibold rounded-lg hover:bg-white active:scale-[0.99] transition shadow-sm"
          >
            Enviar
          </button>

          {output && (
            <pre className="max-h-36 overflow-y-auto bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-300 whitespace-pre-wrap leading-relaxed">
              {output}
            </pre>
          )}
        </>
      )}
    </div>
  );
}
