import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./style.css";
import { installZoomLock } from "./zoom";
installZoomLock();
createRoot(document.getElementById("root")!).render(<App />);
