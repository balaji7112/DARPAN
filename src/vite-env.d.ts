/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the optional FastAPI ML service, e.g. https://darpan-ml.onrender.com */
  readonly VITE_ML_API_URL?: string;
  /** Optional LLM proxy endpoint for the copilot, e.g. /api/copilot on Vercel */
  readonly VITE_COPILOT_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
