"use client";

import { useEffect, useCallback, type ReactNode } from "react";

interface PrintPreviewModalProps {
  children: ReactNode;
  onClose: () => void;
  onPrint: () => void;
  onDownloadPdf: () => void;
}

export default function PrintPreviewModal({
  children,
  onClose,
  onPrint,
  onDownloadPdf,
}: PrintPreviewModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-8 pb-8 px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 shrink-0">
          <h2 className="text-lg font-semibold">列印預覽</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 text-xl leading-none px-2"
          >
            ✕
          </button>
        </div>

        {/* Preview area */}
        <div className="flex-1 overflow-y-auto bg-zinc-100 p-6">
          <div className="bg-white shadow-md mx-auto" style={{ maxWidth: "794px" }}>
            <div className="p-[42px]">{children}</div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-200 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-800"
          >
            關閉
          </button>
          <button
            onClick={onPrint}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            列印
          </button>
          <button
            onClick={onDownloadPdf}
            className="px-4 py-2 bg-zinc-600 text-white rounded-lg hover:bg-zinc-700 text-sm"
          >
            下載 PDF
          </button>
        </div>
      </div>
    </div>
  );
}
