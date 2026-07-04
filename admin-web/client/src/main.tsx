import { createRoot } from "react-dom/client";
import { setBaseUrl, setAuthTokenGetter } from "@workspace/api-client-react";
import App from "./App";
import "./index.css";

// The generated client adds /api/* to every path, so the base URL must be
// the root domain only — never include /api here (see .agents/memory/api-url-prefix.md).
const rawBase = import.meta.env.VITE_API_BASE_URL as string | undefined;
setBaseUrl(rawBase && rawBase.trim() !== "" ? rawBase.trim() : null);

// Supply bearer token from localStorage to every generated hook automatically.
setAuthTokenGetter(() => localStorage.getItem("admin_token"));

createRoot(document.getElementById("root")!).render(<App />);
