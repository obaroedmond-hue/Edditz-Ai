import "./globals.css";
export const metadata = { title: "Editz AI", description: "Free-first AI creative studio" };
export const viewport = { width: "device-width", initialScale: 1, themeColor: "#121217" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="en"><body>{children}</body></html>);
}
