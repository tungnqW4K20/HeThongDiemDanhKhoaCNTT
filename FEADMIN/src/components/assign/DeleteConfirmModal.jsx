import React from 'react';
import { Trash2 } from 'lucide-react';

const DeleteConfirmModalSchedule = ({ isOpen, onClose, onConfirm, subjectName }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
          <Trash2 size={24} />
        </div>
        <h3 className="text-lg font-bold text-gray-800 mb-2">Xóa lịch giảng dạy ?</h3>
        <p className="text-gray-500 text-sm mb-6">
          Bạn có chắc chắn muốn xóa <br/> 
         
          <br/>Hành động này không thể hoàn tác.
        </p>
        <div className="flex gap-3 justify-center">
          <button 
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors text-sm"
          >
            Hủy
          </button>
          <button 
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors shadow-sm text-sm"
          >
            Xóa ngay
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModalSchedule; 