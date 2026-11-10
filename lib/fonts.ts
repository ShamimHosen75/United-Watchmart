import { Cormorant_Garamond, Manrope } from "next/font/google";

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

export const fontVariables = `${display.variable} ${body.variable}`;
