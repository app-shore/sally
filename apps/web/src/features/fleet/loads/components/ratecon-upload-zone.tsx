'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, FileText, Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';

interface RateconUploadZoneProps {
  onFileSelected: (file: File) => void;
  isUploading: boolean;
  error: string | null;
}

export function RateconUploadZone({ onFileSelected, isUploading, error }: RateconUploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndSelect = useCallback(
    (file: File) => {
      if (file.type !== 'application/pdf') {
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        return;
      }
      onFileSelected(file);
    },
    [onFileSelected],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) validateAndSelect(file);
    },
    [validateAndSelect],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) validateAndSelect(file);
    },
    [validateAndSelect],
  );

  if (isUploading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">Parsing rate confirmation...</p>
          <p className="text-xs text-muted-foreground mt-1">
            Extracting load details with AI
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`
          flex flex-col items-center justify-center py-10 px-4
          border-2 border-dashed rounded-lg cursor-pointer
          transition-colors
          ${isDragOver
            ? 'border-foreground bg-accent/50'
            : 'border-border hover:border-foreground/50 hover:bg-accent/30'
          }
        `}
      >
        <div className="flex flex-col items-center space-y-2">
          {isDragOver ? (
            <FileText className="h-8 w-8 text-foreground" />
          ) : (
            <Upload className="h-8 w-8 text-muted-foreground" />
          )}
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">
              {isDragOver ? 'Drop your rate confirmation' : 'Upload rate confirmation'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Drag and drop a PDF file, or click to browse
            </p>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileInput}
          className="hidden"
        />
      </div>
    </div>
  );
}
