// src/pages/_app.tsx

import type { AppProps } from "next/app";
import { AuthProvider } from "../context/AuthContext";
import { BalanceProvider } from "../context/BalanceContext";
import "../styles/global.css";

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <BalanceProvider>
        <Component {...pageProps} />
      </BalanceProvider>
    </AuthProvider>
  );
}

export default MyApp;
