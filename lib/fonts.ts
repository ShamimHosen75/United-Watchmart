import { Cormorant_Garamond, Manrope, Noto_Naskh_Arabic } from "next/font/google";

export const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-display",
  display: "swap",
});

export const body = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const arabic = Noto_Naskh_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500"],
  variable: "--font-arabic",
  display: "swap",
  preload: false,
});

export const fontVariables = `${display.variable} ${body.variable} ${arabic.variable}`;
