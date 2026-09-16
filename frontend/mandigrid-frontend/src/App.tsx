import { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { LoadingState } from "./components/ui/DataStates";
import { FilterProvider } from "./components/layout/FilterContext";

const Overview = lazy(() => import("./pages/Overview"));
const PricesMsp = lazy(() => import("./pages/PricesMsp"));
const Logistics = lazy(() => import("./pages/Logistics"));
const Weather = lazy(() => import("./pages/Weather"));
const Mandis = lazy(() => import("./pages/Mandis"));
const AskMandiGrid = lazy(() => import("./pages/AskMandiGrid"));
const NotFound = lazy(() => import("./pages/NotFound"));

export default function App() {
  return (
    <AppShell>
      <FilterProvider>
        <Suspense fallback={<LoadingState label="Loading page" />}>
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/prices" element={<PricesMsp />} />
            <Route path="/logistics" element={<Logistics />} />
            <Route path="/weather" element={<Weather />} />
            <Route path="/mandis" element={<Mandis />} />
            <Route path="/ask" element={<AskMandiGrid />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </FilterProvider>
    </AppShell>
  );
}
