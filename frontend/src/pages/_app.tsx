// src/pages/_app.tsx
import type { AppProps } from "next/app";
import { AuthProvider } from "@context/AuthContext";
import { JobProvider } from "@context/JobContext";
import { PriceProvider } from "@context/PriceContext";
import { BalanceProvider } from "@context/BalanceContext";
import "../styles/global.css";

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <JobProvider>
        <PriceProvider>
          <BalanceProvider>
            <Component {...pageProps} />
          </BalanceProvider>
        </PriceProvider>
      </JobProvider>
    </AuthProvider>
  );
}

export default MyApp;
