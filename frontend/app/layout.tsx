import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prep Manager",
  description: "Evidence-led prep compliance review",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
