import type { Metadata } from "next";
import { Bowlby_One, Montserrat } from "next/font/google";
import "./globals.css";

const bowlbyOne = Bowlby_One({
  variable: "--font-bowlby-one",
  weight: "400",
  subsets: ["latin"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OpStap Dashboard",
  description: "Beheer dashboard voor OpStap",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${bowlbyOne.variable} ${montserrat.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
