import type { Metadata } from "next";
import ChatClient from "./ChatClient";

export const metadata: Metadata = {
  title: "Chat",
  robots: { index: false, follow: false },
};

export default function MessagesPage() {
  return <ChatClient />;
}
