import { useId, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, FileText, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { ADMIN_UPLOAD_ACCEPT, formatUploadBytes, uploadAdminContentFile } from '@/lib/admin-upload';
import type { AdminUpload } from '@workspace/api-client-react';

export interface UploadFieldValue {
  url: string;
  fileName?: string;
  mimeType?: string;
  sizeBytes?: number;
}

interface AdminUploadFieldProps {
  label: string;
  description: string;
  value: UploadFieldValue;
  disabled?: boolean;
  chooseLabel: string;
  uploadingLabel: string;
  uploadedLabel: string;
  fallbackLabel: string;
  clearLabel: string;
  errorLabel: string;
  onUploaded: (file: AdminUpload) => void;
  onUrlChange: (url: string) => void;
  onClear: () => void;
}

function fileNameFromUrl(url: string): string {
  const clean = url.split('?', 1)[0] ?? '';
  return clean.split('/').filter(Boolean).pop() ?? url;
}

export default function AdminUploadField({
  label,
  description,
  value,
  disabled,
  chooseLabel,
  uploadingLabel,
  uploadedLabel,
  fallbackLabel,
  clearLabel,
  errorLabel,
  onUploaded,
  onUrlChange,
  onClear,
}: AdminUploadFieldProps) {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const displayName = value.fileName || (value.url ? fileNameFromUrl(value.url) : '');

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setIsUploading(true);
    setError('');
    try {
      const uploaded = await uploadAdminContentFile(file);
      onUploaded(uploaded);
    } catch (err) {
      setError((err as { data?: { error?: { message?: string } }; message?: string })?.data?.error?.message ?? errorLabel);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-muted/20 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Label htmlFor={inputId}>{label}</Label>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileInputRef}
            id={inputId}
            type="file"
            accept={ADMIN_UPLOAD_ACCEPT}
            className="sr-only"
            disabled={disabled || isUploading}
            onChange={handleFileChange}
          />
          <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={disabled || isUploading}>
            {isUploading ? <Spinner className="me-2 h-4 w-4" /> : <Upload className="me-2 h-4 w-4" />}
            {isUploading ? uploadingLabel : chooseLabel}
          </Button>
          {value.url ? (
            <Button type="button" variant="outline" onClick={onClear} disabled={disabled || isUploading}>
              {clearLabel}
            </Button>
          ) : null}
        </div>
      </div>

      {displayName ? (
        <div className="mt-4 flex flex-col gap-2 rounded-md border bg-background p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <FileText className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate font-medium text-foreground">{displayName}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {value.mimeType ? <span>{value.mimeType}</span> : null}
            {value.sizeBytes ? <span>{formatUploadBytes(value.sizeBytes)}</span> : null}
            {value.mimeType || value.sizeBytes ? <CheckCircle2 className="h-4 w-4 text-primary" aria-label={uploadedLabel} /> : null}
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="mt-3 flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="mt-4 grid gap-2">
        <Label>{fallbackLabel}</Label>
        <Input value={value.url} onChange={(event) => onUrlChange(event.target.value)} disabled={disabled || isUploading} dir="ltr" />
      </div>
    </div>
  );
}
