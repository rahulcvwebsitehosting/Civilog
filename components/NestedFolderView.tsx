
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, ChevronDown, Folder, GraduationCap, Layers, Users } from 'lucide-react';
import { ODRequest } from '../types';
import FeedCard from './FeedCard';

interface NestedFolderViewProps {
  requests: ODRequest[];
  onApprove: (req: ODRequest) => void;
  onReject: (req: ODRequest) => void;
  processingId: string | null;
}

const NestedFolderView: React.FC<NestedFolderViewProps> = ({ requests, onApprove, onReject, processingId }) => {
  const [expandedDepts, setExpandedDepts] = useState<Record<string, boolean>>({});
  const [expandedYears, setExpandedYears] = useState<Record<string, boolean>>({});
  const [expandedSems, setExpandedSems] = useState<Record<string, boolean>>({});

  const toggleDept = (dept: string) => {
    setExpandedDepts(prev => ({ ...prev, [dept]: !prev[dept] }));
  };

  const toggleYear = (dept: string, year: string) => {
    const key = `${dept}-${year}`;
    setExpandedYears(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleSem = (dept: string, year: string, sem: string) => {
    const key = `${dept}-${year}-${sem}`;
    setExpandedSems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Grouping logic
  const groupedData: Record<string, Record<string, Record<string, ODRequest[]>>> = {};

  requests.forEach(req => {
    const dept = req.department || 'Unassigned';
    const year = req.year || 'Unknown Year';
    const sem = req.semester || 'Unknown Sem';

    if (!groupedData[dept]) groupedData[dept] = {};
    if (!groupedData[dept][year]) groupedData[dept][year] = {};
    if (!groupedData[dept][year][sem]) groupedData[dept][year][sem] = [];

    groupedData[dept][year][sem].push(req);
  });

  const sortedDepts = Object.keys(groupedData).sort();

  if (requests.length === 0) {
    return (
      <div className="p-20 text-center bg-white rounded-[2rem] border shadow-sm">
        <Folder size={48} className="mx-auto text-slate-200 mb-4" />
        <p className="text-slate-400 uppercase text-[10px] font-black tracking-[0.2em]">No records found for this selection</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sortedDepts.map(dept => {
        const deptRequests = Object.values(groupedData[dept]).flatMap(y => Object.values(y).flat());
        const isExpanded = expandedDepts[dept];

        return (
          <div key={dept} className="bg-white rounded-3xl border shadow-sm overflow-hidden">
            <button
              onClick={() => toggleDept(dept)}
              className="w-full px-6 py-5 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
            >
              <div className="flex items-center gap-4">
                <div className={`p-2.5 rounded-xl ${isExpanded ? 'bg-blueprint-blue text-white' : 'bg-slate-100 text-slate-500'}`}>
                  <Folder size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight italic">{dept}</h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{deptRequests.length} Total Requests</p>
                </div>
              </div>
              {isExpanded ? <ChevronDown size={20} className="text-slate-400" /> : <ChevronRight size={20} className="text-slate-400" />}
            </button>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-slate-100 bg-slate-50/30"
                >
                  <div className="p-4 space-y-3">
                    {Object.keys(groupedData[dept]).sort().map(year => {
                      const yearKey = `${dept}-${year}`;
                      const isYearExpanded = expandedYears[yearKey];
                      const yearRequests = Object.values(groupedData[dept][year]).flat();

                      return (
                        <div key={year} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                          <button
                            onClick={() => toggleYear(dept, year)}
                            className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
                          >
                            <div className="flex items-center gap-3">
                              <GraduationCap size={18} className="text-blueprint-blue" />
                              <span className="text-xs font-black text-slate-700 uppercase tracking-widest italic">{year} Year</span>
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md text-[9px] font-bold">{yearRequests.length}</span>
                            </div>
                            {isYearExpanded ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                          </button>

                          <AnimatePresence>
                            {isYearExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="border-t border-slate-100 px-4 pb-4 pt-2 space-y-2"
                              >
                                {Object.keys(groupedData[dept][year]).sort((a, b) => parseInt(a) - parseInt(b)).map(sem => {
                                  const semKey = `${dept}-${year}-${sem}`;
                                  const isSemExpanded = expandedSems[semKey];
                                  const semRequests = groupedData[dept][year][sem];

                                  return (
                                    <div key={sem} className="bg-slate-50/50 rounded-xl border border-slate-100 overflow-hidden">
                                      <button
                                        onClick={() => toggleSem(dept, year, sem)}
                                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-100 transition-colors text-left"
                                      >
                                        <div className="flex items-center gap-2">
                                          <Layers size={14} className="text-slate-400" />
                                          <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{sem} Semester</span>
                                          <span className="text-[9px] font-bold text-slate-400">({semRequests.length})</span>
                                        </div>
                                        {isSemExpanded ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
                                      </button>

                                      <AnimatePresence>
                                        {isSemExpanded && (
                                          <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="px-4 pb-4 pt-2 space-y-4"
                                          >
                                            {semRequests.map(req => (
                                              <FeedCard
                                                key={req.id}
                                                request={req}
                                                isFaculty={true}
                                                isProcessing={processingId === req.id}
                                                onApprove={onApprove}
                                                onReject={onReject}
                                              />
                                            ))}
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
                                    </div>
                                  );
                                })}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
};

export default NestedFolderView;
