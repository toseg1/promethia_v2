import React from 'react';

interface DeleteConfirmationProps {
  open: boolean;
  title?: string;
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  confirming?: boolean;
}

export function DeleteConfirmation({
  open,
  title = 'Remove Event',
  description,
  onConfirm,
  onCancel,
  confirmLabel = 'Delete Event',
  cancelLabel = 'Keep Event',
  confirming = false,
}: DeleteConfirmationProps) {
  if (!open) return null;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-border/30 bg-white shadow-xl p-6 space-y-4 text-left">
        <div>
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={confirming}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-border/40 text-muted-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirming}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

