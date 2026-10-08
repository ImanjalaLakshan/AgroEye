import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// Existing CSS
import "./index.css";

// Tailwind CSS v4
import "./styles/agroeye-tailwind.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);