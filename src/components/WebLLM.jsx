import { useState } from "react";
import { loadModel, streamChat, listModels } from "../services/webllm/engine";

export default function WebLLM() {
  const [isOpen, setIsOpen] = useState(true);
  const [model, setModel] = useState("");
  const [status, setStatus] = useState("");
  const [prompt, setPrompt] = useState("");
  const [output, setOutput] = useState("");

  const t0 = performance.now();

  const handleLoad = async () => {
    try {
      await loadModel(model, (p) => setStatus(p.text));
      console.log(
        `[WebLLM] carregamento: ${((performance.now() - t0) / 1000).toFixed(2)} s`,
      );
      setStatus("Modelo carregado.");
    } catch (e) {
      setStatus("Erro: " + e.message);
    }
  };

  const handleSend = async () => {
    setOutput("");
    for await (const token of streamChat([{ role: "user", content: prompt }])) {
      setOutput((prev) => prev + token);
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
