
  import { createRoot } from "react-dom/client";
  import App from "./App.tsx";
  import "./index.css";
  // Loaded AFTER index.css so the monochrome overrides win the cascade.
  // Centralized theme — edit src/styles/monochrome.css to retune the look.
  import "./styles/monochrome.css";

  createRoot(document.getElementById("root")!).render(<App />);
  