import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "ECE Study", template: "%s | ECE Study" },
  description: "A free, independent study workspace aligned with National University's electrical and computer engineering curriculum.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
