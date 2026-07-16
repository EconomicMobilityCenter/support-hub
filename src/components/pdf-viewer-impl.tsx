import { useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export default function PdfViewerImpl({ url }: { url: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [width, setWidth] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Uint8Array | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const update = () => setWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    setError(null);
    setData(null);
    fetch(url, { signal: ctrl.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.arrayBuffer();
      })
      .then((buf) => setData(new Uint8Array(buf)))
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message || "fetch failed");
      });
    return () => ctrl.abort();
  }, [url]);

  const fileProp = useMemo(() => (data ? { data } : null), [data]);

  return (
    <div className="pdf-embed" style={{ margin: "0.5rem 0" }}>
      <div
        ref={containerRef}
        style={{
          border: "1px solid #E2E4E8",
          borderRadius: 8,
          background: "#F4F5F7",
          padding: 8,
          minHeight: 200,
        }}
      >
        {error ? (
          <p style={{ color: "#6B6F76", fontSize: 14, padding: 12 }}>
            Couldn't load PDF ({error}). Use the link below to open it in a new tab.
          </p>
        ) : fileProp ? (
          <Document
            file={fileProp}
            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
            onLoadError={(e) => setError(e.message)}
            loading={
              <p style={{ color: "#6B6F76", fontSize: 14, padding: 12 }}>
                Loading PDF…
              </p>
            }
          >
            {width > 0 &&
              Array.from({ length: numPages }, (_, i) => (
                <div key={i} style={{ marginBottom: 8 }}>
                  <Page
                    pageNumber={i + 1}
                    width={width - 16}
                    renderAnnotationLayer={false}
                    renderTextLayer={false}
                  />
                </div>
              ))}
          </Document>
        ) : (
          <p style={{ color: "#6B6F76", fontSize: 14, padding: 12 }}>
            Loading PDF…
          </p>
        )}
      </div>
      <div style={{ marginTop: 6, fontSize: "0.875rem" }}>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#185FA5", textDecoration: "underline" }}
        >
          Open PDF in new tab
        </a>
      </div>
    </div>
  );
}
