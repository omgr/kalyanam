"use client";

import { ReactNode, useEffect } from "react";
import { ThemeProvider } from "next-themes";
import { installGlobalDiagnostics } from "@/lib/diagnostics/global-handlers";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  // Mounted once, at the root, so every screen is covered rather than only the
  // ones somebody remembered to instrument.
  useEffect(() => installGlobalDiagnostics(), []);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
}

