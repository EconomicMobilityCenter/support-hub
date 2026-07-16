import { lazy, Suspense } from "react";
import { ClientOnly } from "@tanstack/react-router";

const PdfViewerImpl = lazy(() => import("./pdf-viewer-impl"));

const Fallback = () => (
  <div
    style={{
      border: "1px solid #E2E4E8",
      borderRadius: 8,
      background: "#F4F5F7",
      padding: 12,
      color: "#6B6F76",
      fontSize: 14,
      margin: "0.5rem 0",
    }}
  >
    Loading PDF…
  </div>
);

export function PdfViewer({ url }: { url: string }) {
  return (
    <ClientOnly fallback={<Fallback />}>
      <Suspense fallback={<Fallback />}>
        <PdfViewerImpl url={url} />
      </Suspense>
    </ClientOnly>
  );
}
