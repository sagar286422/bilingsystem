import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";

import { AppProviders } from "@/components/providers/app-providers";

import "./globals.css";
import "./theme-palettes.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: {
    default: "Billing",
    template: "%s · Billing",
  },
  description:
    "Developer-first billing: organizations, companies, teams, products & versioned prices, subscriptions, invoices, and multi-gateway payments.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full font-sans">
        <Script id="billing-palette-init" strategy="beforeInteractive">
          {`(function(){try{var r=localStorage.getItem("billing-palette");if(!r)return;var p=JSON.parse(r),s=p&&p.state;if(!s)return;var el=document.documentElement;if(s.palette&&s.palette!=="teal")el.setAttribute("data-palette",s.palette);var c=s.customColors;if(!c||typeof c!=="object")return;var m={background:"--background",foreground:"--foreground",mutedForeground:"--muted-foreground",card:"--card",cardForeground:"--card-foreground",border:"--border",primary:"--primary",primaryForeground:"--primary-foreground",accent:"--accent",sidebar:"--sidebar",sidebarForeground:"--sidebar-foreground"};for(var k in m){if(Object.prototype.hasOwnProperty.call(c,k)&&c[k])el.style.setProperty(m[k],c[k]);}}catch(e){}})();`}
        </Script>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
