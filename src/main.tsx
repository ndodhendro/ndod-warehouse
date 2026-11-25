import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import "@fontsource/manrope/latin-400.css"
import "@fontsource/manrope/latin-500.css"
import "@fontsource/manrope/latin-600.css"
import "@fontsource/manrope/latin-700.css"
import "@fontsource/manrope/latin-ext-400.css"
import "@fontsource/manrope/latin-ext-500.css"
import "@fontsource/manrope/latin-ext-600.css"
import "@fontsource/manrope/latin-ext-700.css"
import "./index.css"
import "./lib/kunciZoom"
import "./lib/pasang"
import App from "./App"
import { ConfirmProvider, ToastProvider } from "./components/ui"
import { SesiProvider } from "./lib/sesi"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 10_000,
    },
  },
})

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <SesiProvider>
        <ToastProvider>
          <ConfirmProvider>
            <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <App />
            </BrowserRouter>
          </ConfirmProvider>
        </ToastProvider>
      </SesiProvider>
    </QueryClientProvider>
  </StrictMode>,
)
