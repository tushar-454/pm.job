import { Toaster } from "@/components/ui/sonner";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
    variable: "--font-inter",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "Parfect Match Job",
    description:
        "Find your parfect job with our job search platform. We connect job seekers with top employers, making it easy to find the right job for you. Start your job search today and discover your parfect job!",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html
            lang="en"
            className={`${inter.variable} h-full antialiased`}
        >
            <body className="min-h-full flex flex-col">
                {children}
                <Toaster
                    richColors
                    position="top-right"
                />
            </body>
        </html>
    );
}
