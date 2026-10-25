import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";
import "./customer/customer.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {import.meta.env.VITE_EPHEMERAL_DEMO === "true" && (
      <aside className="deployment-notice" aria-label="Public demo notice">
        Public demo · Accounts, purchases and stock changes reset when hosting restarts.
        Use demo details only. Payments are simulated.
      </aside>
    )}
    <App />
  </React.StrictMode>,
);
