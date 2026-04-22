import React from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';

const DeleteConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  studentName,
  title = 'Xác nhận xóa sinh viên',
  description,
  warningMessage,
  confirmLabel = 'Xóa sinh viên'
}) => {
  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  const defaultDescription = `Bạn có chắc chắn muốn xóa sinh viên ${studentName || ''} không? Hành động này không thể hoàn tác.`;

  return createPortal(
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/45 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={24} />
          </div>
          <h3 className="text-lg font-bold text-gray-800 mb-2">{title}</h3>
          <p className="text-gray-500 text-sm mb-6">
            {description || defaultDescription}
          </p>
          {warningMessage && (
            <div className="mb-4 text-left p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-xs leading-relaxed">
              {warningMessage}
            </div>
          )}
          <div className="flex gap-3 justify-center">
            <button onClick={onClose} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors">Hủy bỏ</button>
            <button onClick={onConfirm} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors shadow-sm">{confirmLabel}</button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default DeleteConfirmModal;