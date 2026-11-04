import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import CartDrawer from "@/components/CartDrawer";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import QuickView from "@/components/QuickView";
import Toast from "@/components/Toast";
import { CartProvider } from "@/context/CartContext";
import { MALL } from "@/lib/data";

const font = Plus_Jakarta_Sans({ variable: "--font-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: `${MALL.name} · ${MALL.tagline}`, template: `%s · ${MALL.name}` },
  description: `${MALL.tagline}. Order online for pickup or same-day delivery.`,
};

// Applies the saved theme before first paint so there's no flash.
const themeScript = `try{var t=localStorage.getItem("dotkad-theme");if(t)document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={font.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <CartProvider>
          <Header />
          <main className="main">{children}</main>
          <Footer />
          <CartDrawer />
          <QuickView />
          <Toast />
        </CartProvider>
      </body>
    </html>
  );
}
