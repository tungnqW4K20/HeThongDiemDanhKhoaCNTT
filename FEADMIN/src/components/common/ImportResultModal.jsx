import React from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, CheckCircle2, FileSpreadsheet, X } from 'lucide-react';

const ImportResultModal = ({
  isOpen,
  onClose,
  title = 'Kết quả import',
  summary = null,
  successRows = [],
  failedRows = []
}) => {
  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  const total = (summary && typeof summary.totalRows === 'number')
    ? summary.totalRows
    : (successRows.length + failedRows.length);
  const successCount = (summary && typeof summary.successCount === 'number')
    ? summary.successCount
    : successRows.length;
  const failedCount = (summary && typeof summary.failedCount === 'number')
    ? summary.failedCount
    : failedRows.length;

  return createPortal(
    <div className="fixed inset-0 z-10000 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-2xl border border-gray-100 flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-[#3B5998] flex items-center gap-2">
              <FileSpreadsheet size={20} className="text-[#3B5998]" />
              {title}
            </h3>
            <p className="text-xs text-gray-500 mt-1">Theo dõi trạng thái từng bản ghi sau khi import Excel.</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 border-b border-gray-100 bg-white grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs text-slate-500 font-semibold uppercase">Tổng bản ghi</p>
            <p className="text-2xl font-bold text-slate-700">{total}</p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <p className="text-xs text-emerald-700 font-semibold uppercase">Thành công</p>
            <p className="text-2xl font-bold text-emerald-700">{successCount}</p>
          </div>
          <div className="rounded-xl border border-red-200 bg-red-50 p-3">
            <p className="text-xs text-red-700 font-semibold uppercase">Lỗi hoặc bỏ qua</p>
            <p className="text-2xl font-bold text-red-700">{failedCount}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <section>
            <h4 className="font-semibold text-emerald-700 mb-3 flex items-center gap-2">
              <CheckCircle2 size={16} />
              Bản ghi thành công ({successRows.length})
            </h4>
            {successRows.length === 0 ? (
              <div className="text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-lg p-3">
                Không có bản ghi thành công.
              </div>
            ) : (
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="min-w-full text-sm">
                  <thead className="bg-emerald-50 text-emerald-800">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">Dòng</th>
                      <th className="px-3 py-2 text-left font-semibold">Bản ghi</th>
                      <th className="px-3 py-2 text-left font-semibold">Kết quả</th>
                    </tr>
                  </thead>
                  <tbody>
                    {successRows.map((item, index) => (
                      <tr key={`success-${index}`} className="border-t border-gray-100">
                        <td className="px-3 py-2 text-gray-700 font-medium">{item.rowNumber || '-'}</td>
                        <td className="px-3 py-2 text-gray-700">{item.label || item.message || '-'}</td>
                        <td className="px-3 py-2 text-emerald-700">{item.reason || 'Đã import thành công'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section>
            <h4 className="font-semibold text-red-700 mb-3 flex items-center gap-2">
              <AlertCircle size={16} />
              Bản ghi lỗi/bỏ qua ({failedRows.length})
            </h4>
            {failedRows.length === 0 ? (
              <div className="text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-lg p-3">
                Không có bản ghi lỗi.
              </div>
            ) : (
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="min-w-full text-sm">
                  <thead className="bg-red-50 text-red-800">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">Dòng</th>
                      <th className="px-3 py-2 text-left font-semibold">Bản ghi</th>
                      <th className="px-3 py-2 text-left font-semibold">Lý do</th>
                    </tr>
                  </thead>
                  <tbody>
                    {failedRows.map((item, index) => (
                      <tr key={`failed-${index}`} className="border-t border-gray-100">
                        <td className="px-3 py-2 text-gray-700 font-medium">{item.rowNumber || '-'}</td>
                        <td className="px-3 py-2 text-gray-700">{item.label || item.message || '-'}</td>
                        <td className="px-3 py-2 text-red-700">{item.reason || item.message || 'Lỗi không xác định'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#3B5998] text-white font-medium hover:bg-[#2e4676] transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ImportResultModal;
