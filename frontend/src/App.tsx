import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/layout/Layout";
import HomePage from "./pages/HomePage";
import StockPage from "./pages/StockPage";

/** Root component — sets up routing for the application. */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/stock/:ticker" element={<StockPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
