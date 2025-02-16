// src/pages/_app.tsx
import type { AppProps } from "next/app";
import { AuthProvider } from "@context/AuthContext";
import { BalanceProvider } from "@context/BalanceContext";
import { JobProvider } from "@context/JobContext";
import "../styles/global.css";

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <JobProvider>
        <BalanceProvider>
          <Component {...pageProps} />
        </BalanceProvider>
      </JobProvider>
    </AuthProvider>
  );
}

export default MyApp;
