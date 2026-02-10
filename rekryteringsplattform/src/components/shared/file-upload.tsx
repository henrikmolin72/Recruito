"use client";

import { useCallback, useRef, useState } from "react";
import { UploadCloud, File, X, CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

interface FileUploadProps {
  accept?: string;
  maxSize?: number;
  onUpload?: (url: string, fileName: string) => void;
  label?: string;
  bucket?: string;
  folder?: string;
  className?: string;
}

type UploadStatus = "idle" | "uploading" | "success" | "error";

export function FileUpload({
  accept = ".pdf,.doc,.docx",
  maxSize = 10 * 1024 * 1024, // 10MB default
  onUpload,
  label = "Ladda upp fil",
  bucket = "uploads",
  folder = "documents",
  className,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const validateFile = (file: File): string | null => {
    if (file.size > maxSize) {
      return `Filen ar for stor. Max storlek: ${formatFileSize(maxSize)}`;
    }

    if (accept) {
      const allowedExtensions = accept.split(",").map((ext) => ext.trim().toLowerCase());
      const fileExtension = `.${file.name.split(".").pop()?.toLowerCase()}`;
      const fileMimeType = file.type;

      const isAllowed = allowedExtensions.some(
        (ext) =>
          ext === fileExtension ||
          ext === fileMimeType ||
          (ext.includes("*") && fileMimeType.startsWith(ext.replace("*", "")))
      );

      if (!isAllowed) {
        return `Filtypen stods inte. Tillitna format: ${accept}`;
      }
    }

    return null;
  };

  const handleFile = useCallback(
    (file: File) => {
      const error = validateFile(file);
      if (error) {
        setErrorMessage(error);
        setUploadStatus("error");
        return;
      }

      setSelectedFile(file);
      setErrorMessage(null);
      setUploadStatus("idle");
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [accept, maxSize]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFile(files[0]);
      }
    },
    [handleFile]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFile(files[0]);
      }
    },
    [handleFile]
  );

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploadStatus("uploading");
    setUploadProgress(0);

    try {
      const supabase = createClient();

      // Generate a unique file name
      const timestamp = Date.now();
      const sanitizedName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath = `${folder}/${timestamp}-${sanitizedName}`;

      // Simulate progress (Supabase JS client does not have built-in progress)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, selectedFile, {
          cacheControl: "3600",
          upsert: false,
        });

      clearInterval(progressInterval);

      if (error) {
        throw error;
      }

      setUploadProgress(100);
      setUploadStatus("success");

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      onUpload?.(urlData.publicUrl, selectedFile.name);
    } catch (err) {
      setUploadStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Uppladdningen misslyckades"
      );
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setUploadStatus("idle");
    setUploadProgress(0);
    setErrorMessage(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <div className={cn("w-full", className)}>
      {label && (
        <label className="mb-2 block text-sm font-medium text-foreground">
          {label}
        </label>
      )}

      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !selectedFile && inputRef.current?.click()}
        className={cn(
          "relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors",
          isDragging
            ? "border-brand-500 bg-brand-50"
            : "border-muted-foreground/25 hover:border-brand-400 hover:bg-muted/50",
          !selectedFile && "cursor-pointer",
          uploadStatus === "error" && "border-danger-500 bg-danger-50"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleInputChange}
          className="hidden"
        />

        {!selectedFile && uploadStatus !== "error" && (
          <>
            <UploadCloud
              className={cn(
                "mb-3 size-10",
                isDragging ? "text-brand-500" : "text-muted-foreground"
              )}
            />
            <p className="text-sm font-medium text-foreground">
              Dra och slapp din fil har
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              eller klicka for att valja fil
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {accept.replace(/\./g, "").toUpperCase()} upp till{" "}
              {formatFileSize(maxSize)}
            </p>
          </>
        )}

        {selectedFile && (
          <div className="flex w-full items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-50">
              <File className="size-5 text-brand-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {selectedFile.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(selectedFile.size)}
              </p>
            </div>
            {uploadStatus === "success" ? (
              <CheckCircle className="size-5 shrink-0 text-success-500" />
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveFile();
                }}
                className="shrink-0 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        )}

        {uploadStatus === "error" && !selectedFile && (
          <>
            <AlertCircle className="mb-3 size-10 text-danger-500" />
            <p className="text-sm font-medium text-danger-500">
              {errorMessage}
            </p>
            <button
              type="button"
              onClick={() => {
                setUploadStatus("idle");
                setErrorMessage(null);
              }}
              className="mt-2 text-xs font-medium text-brand-600 hover:underline"
            >
              Forsok igen
            </button>
          </>
        )}
      </div>

      {/* Progress bar */}
      {uploadStatus === "uploading" && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Laddar upp...</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-brand-500 transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error message for selected file */}
      {uploadStatus === "error" && selectedFile && (
        <p className="mt-2 text-xs text-danger-500">{errorMessage}</p>
      )}

      {/* Upload button */}
      {selectedFile && uploadStatus !== "success" && (
        <Button
          type="button"
          onClick={handleUpload}
          disabled={uploadStatus === "uploading"}
          className="mt-3 w-full bg-brand-600 text-white hover:bg-brand-700"
        >
          {uploadStatus === "uploading" ? "Laddar upp..." : "Ladda upp"}
        </Button>
      )}

      {/* Success state */}
      {uploadStatus === "success" && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-success-500">
          <CheckCircle className="size-3.5" />
          <span>Uppladdningen lyckades!</span>
        </div>
      )}
    </div>
  );
}
