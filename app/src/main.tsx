import { registerSW } from "virtual:pwa-register";
import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createAppRouter } from "./app/router";
import { requestPersistentStorage } from "./lib/persistentStorage";
import "./index.css";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Root element #root not found");
}

registerSW();
void requestPersistentStorage();

createRoot(root).render(
  <StrictMode>
    <RouterProvider router={createAppRouter()} />
  </StrictMode>,
);
