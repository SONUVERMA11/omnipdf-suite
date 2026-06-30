"use client";
import { useCallback, useState } from "react";

interface DropZoneProps {
  onFiles: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  label?: string;
  sublabel?: string;
  icon?: React.ReactNode;
  maxSizeMB?: number;
  className?: string;
}

export function DropZone({
  onFiles,
  accept = "*",
  multiple = true,
  label = "Drop files here",
  sublabel = "or click to browse",
  icon,
  maxSizeMB = 500,
  className = "",
}: DropZoneProps) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = (files: File[]) => {
    for (const f of files) {
      if (f.size > maxSizeMB * 1024 * 1024) {
        setError(`${f.name} exceeds ${maxSizeMB}MB limit.`);
        return false;
      }
    }
    setError(null);
    return true;
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const files = Array.from(e.dataTransfer.files);
      const filtered = accept === "*" ? files : files.filter((f) => {
        const acceptTypes = accept.split(",").map((a) => a.trim());
        return acceptTypes.some((t) => {
          if (t.startsWith(".")) return f.name.toLowerCase().endsWith(t.toLowerCase());
          if (t.endsWith("/*")) return f.type.startsWith(t.replace("/*", ""));
          return f.type === t;
        });
      });
      if (filtered.length && validate(filtered)) onFiles(multiple ? filtered : [filtered[0]]);
    },
    [onFiles, accept, multiple, maxSizeMB]
  );

  const handleClick = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.multiple = multiple;
    input.onchange = (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      if (files.length && validate(files)) onFiles(files);
    };
    input.click();
  };

  return (
    <div className="flex flex-col gap-2">
      <div
        className={`drop-zone flex flex-col items-center justify-center gap-4 p-12 text-center ${dragging ? "drag-over" : ""} ${className}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        {icon && (
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{
              background: dragging
                ? "rgba(99,102,241,0.2)"
                : "rgba(99,102,241,0.08)",
              border: "1px solid rgba(99,102,241,0.2)",
              transition: "all 0.3s",
            }}
          >
            {icon}
          </div>
        )}
        <div>
          <p className="font-semibold" style={{ color: "var(--text-primary)", fontSize: "16px" }}>
            {label}
          </p>
          <p style={{ color: "var(--text-muted)", fontSize: "13px", marginTop: "4px" }}>
            {sublabel}
          </p>
        </div>
        <div
          className="px-4 py-2 rounded-xl text-xs font-medium"
          style={{
            background: "rgba(99,102,241,0.1)",
            border: "1px solid rgba(99,102,241,0.2)",
            color: "var(--accent-active-text)",
          }}
        >
          Max {maxSizeMB}MB per file
        </div>
      </div>
      {error && (
        <p className="text-red-400 text-sm px-2">{error}</p>
      )}
    </div>
  );
}
