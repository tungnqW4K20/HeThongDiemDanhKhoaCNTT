import React from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X } from 'lucide-react';

const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, title = "Xác nhận xóa", message, studentName }) => {
  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/45 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm border border-gray-100 overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full text-red-600 mb-4">
            <AlertTriangle size={24} />
          </div>
          
          <h3 className="text-lg font-bold text-gray-900 text-center mb-2">
            {title}
          </h3>
          
          <p className="text-sm text-gray-500 text-center">
            {message || `Bạn có chắc chắn muốn xóa ${studentName}? Hành động này không thể hoàn tác.`}
          </p>
        </div>

        <div className="flex border-t border-gray-100">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors border-r border-gray-100"
          >
            Hủy bỏ
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
          >
            Xác nhận xóa
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default DeleteConfirmModal;