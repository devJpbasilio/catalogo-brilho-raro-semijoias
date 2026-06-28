import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  isDanger = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] animate-fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-neutral-100 relative overflow-hidden animate-scale-up">
        {/* Banner/Accent Line for Danger */}
        <div className={`absolute top-0 left-0 right-0 h-1.5 ${isDanger ? 'bg-red-500' : 'bg-amber-500'}`} />

        {/* Header */}
        <div className="flex items-start gap-4 mt-2">
          <div className={`p-3 rounded-2xl shrink-0 ${isDanger ? 'bg-red-50 text-red-650' : 'bg-amber-50 text-amber-650'}`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="space-y-1.5 flex-1">
            <h3 className="text-base font-serif font-bold text-neutral-800 leading-snug">
              {title}
            </h3>
            <div className="text-sm text-neutral-500 leading-relaxed">
              {message}
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 rounded-full hover:bg-neutral-150 text-neutral-400 hover:text-neutral-600 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 mt-6 pt-3 border-t border-neutral-100">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-neutral-100 hover:bg-neutral-200 active:scale-98 text-neutral-700 font-semibold text-xs py-2.5 rounded-xl transition-all cursor-pointer text-center"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={async () => {
              await onConfirm();
            }}
            className={`flex-1 font-semibold text-xs py-2.5 rounded-xl text-white transition-all active:scale-98 cursor-pointer shadow-xs text-center ${
              isDanger 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-amber-600 hover:bg-amber-700'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
