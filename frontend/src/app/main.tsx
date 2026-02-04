import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../styles/index.css";
import AppRouter from "./router";
import { Toaster } from "react-hot-toast";
import { UserProvider } from "../context/UserContext";
import { AuthProvider } from "../context/AuthContext";

const root = document.getElementById("root");
if (!root) throw new Error("No se encontró el elemento 'root' en el HTML.");

createRoot(root).render(
  <StrictMode>
    <AuthProvider>
      <UserProvider>
        <AppRouter />
        <Toaster position="top-right" />
      </UserProvider>
    </AuthProvider>
  </StrictMode>
);