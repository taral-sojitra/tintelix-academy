import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/bricolage-grotesque/600.css";
import "@fontsource/bricolage-grotesque/700.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/ibm-plex-mono/600.css";
import "@tintelix/theme/theme.css";
import "@tintelix/stage/stage.css";
import "./globals.css";
import { TopBar } from "../ui/TopBar";
import { THEME_SCRIPT } from "../ui/theme";

export const metadata: Metadata = {
  title: { default: "Tintelix: learn system design by watching it move", template: "%s · Tintelix" },
  description: "Interactive, animated lessons in system design, networks, APIs, Linux, microservices, SQL and DSA.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <a className="skip" href="#main">
          Skip to content
        </a>
        <TopBar />
        <div id="main">{children}</div>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
