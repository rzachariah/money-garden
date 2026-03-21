import Link from "next/link";
import {
  ClerkProvider,
  Show,
  SignInButton,
  SignUpButton,
  UserButton
} from "@clerk/nextjs";
import "./globals.css";

export const metadata = {
  title: "Money Garden",
  description: "Upload transactions, spot money leaks, and course-correct calmly."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ClerkProvider>
          <header className="site-header">
            <Link className="site-brand" href="/">
              Money Garden
            </Link>
            <div className="site-nav">
              <Show when="signed-out">
                <SignInButton mode="modal">
                  <button className="ghost-button" type="button">
                    Sign in
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="primary-button" type="button">
                    Sign up
                  </button>
                </SignUpButton>
              </Show>
              <Show when="signed-in">
                <Link className="ghost-button" href="/dashboard">
                  Dashboard
                </Link>
                <div className="user-pill">
                  <UserButton />
                </div>
              </Show>
            </div>
          </header>
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
