'use client';

import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { loadsApi } from '../api';
import type { RateconData } from '../types/ratecon';
import { RateconUploadZone } from './ratecon-upload-zone';
import { RateconReviewForm } from './ratecon-review-form';

interface ImportRateconDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

type Step = 'upload' | 'review';

export function ImportRateconDialog({ open, onOpenChange, onSuccess }: ImportRateconDialogProps) {
  const [step, setStep] = useState<Step>('upload');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<RateconData | null>(null);
  const [fileName, setFileName] = useState('');

  const reset = useCallback(() => {
    setStep('upload');
    setIsUploading(false);
    setUploadError(null);
    setParsedData(null);
    setFileName('');
  }, []);

  const handleFileSelected = useCallback(async (file: File) => {
    setIsUploading(true);
    setUploadError(null);
    setFileName(file.name);

    try {
      const result = await loadsApi.parseRatecon(file);
      setParsedData(result.data);
      setStep('review');
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Failed to parse rate confirmation');
    } finally {
      setIsUploading(false);
    }
  }, []);

  const handleSuccess = useCallback(() => {
    reset();
    onOpenChange(false);
    onSuccess();
  }, [reset, onOpenChange, onSuccess]);

  const handleCancel = useCallback(() => {
    reset();
    onOpenChange(false);
  }, [reset, onOpenChange]);

  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) reset();
    onOpenChange(open);
  }, [reset, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 'upload' ? 'Import Rate Confirmation' : 'Review Extracted Load'}
          </DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <RateconUploadZone
            onFileSelected={handleFileSelected}
            isUploading={isUploading}
            error={uploadError}
          />
        )}

        {step === 'review' && parsedData && (
          <RateconReviewForm
            data={parsedData}
            fileName={fileName}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
            onBack={reset}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
