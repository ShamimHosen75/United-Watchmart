// The real root layout is app/[locale]/layout.tsx, which owns <html> and <body>.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
