import type { Metadata } from "next";
import SavedClient from "./SavedClient";

export const metadata: Metadata = { title: "Saved items" };

export default function SavedPage() {
  return (
    <div className="container page">
      <SavedClient />
    </div>
  );
}
