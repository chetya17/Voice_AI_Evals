"use client";

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApiKeyProvider } from "@/contexts/ApiKeyContext";
import { DataPersistenceProvider } from "@/contexts/DataPersistenceContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { AuthWrapper } from "@/components/AuthWrapper";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const queryClient = new QueryClient();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ApiKeyProvider>
              <DataPersistenceProvider>
                <TooltipProvider>
                  <Toaster />
                  <Sonner />
                  <AuthWrapper>
                    {children}
                  </AuthWrapper>
                </TooltipProvider>
              </DataPersistenceProvider>
            </ApiKeyProvider>
          </AuthProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}
