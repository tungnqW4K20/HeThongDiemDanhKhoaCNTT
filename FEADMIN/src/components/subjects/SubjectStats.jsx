import React from 'react';
import { BookOpen, CheckCircle } from 'lucide-react';

const SubjectStats = ({ totalSubjects, totalCredits }) => {
  return (
    <div className="flex gap-3">
      <div className="bg-white px-4 py-3 rounded-lg shadow-sm border border-gray-200 flex items-center gap-3 min-w-[140px]">
        <div className="p-2 bg-blue-50 text-[#3B5998] rounded-full">
          <BookOpen size={20}/>
        </div>
        <div>
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Tổng môn</p>
          <p className="font-bold text-xl leading-none text-gray-800">{totalSubjects}</p>
        </div>
      </div>
      
      <div className="bg-white px-4 py-3 rounded-lg shadow-sm border border-gray-200 flex items-center gap-3 min-w-[140px]">
        <div className="p-2 bg-green-50 text-green-700 rounded-full">
          <CheckCircle size={20}/>
        </div>
        <div>
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Tổng tín chỉ</p>
          <p className="font-bold text-xl leading-none text-gray-800">{totalCredits}</p>
        </div>
      </div>
    </div>
  );
};

export default SubjectStats;