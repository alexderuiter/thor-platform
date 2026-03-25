import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import ZakenOverzicht from "./pages/ZakenOverzicht";
import ZaakDetail from "./pages/ZaakDetail";
import NieuweZaak from "./pages/NieuweZaak";
import Werkvoorraad from "./pages/Werkvoorraad";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />}>
          <Route index element={<ZakenOverzicht />} />
          <Route path="zaken" element={<ZakenOverzicht />} />
          <Route path="zaken/nieuw" element={<NieuweZaak />} />
          <Route path="zaken/:id" element={<ZaakDetail />} />
          <Route path="werkvoorraad" element={<Werkvoorraad />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
