import React from "react";
import ReactDOM from "react-dom/client";
import ThetaFrame from "./App.jsx"; // 👈 must match your component name
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThetaFrame />
  </React.StrictMode>
);
