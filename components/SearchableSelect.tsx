
import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';

interface SearchableSelectProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label?: string;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({ options, value, onChange, placeholder, label }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="space-y-1.5 relative" ref={containerRef}>
      {label && <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">{label}</label>}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-white dark:bg-gray-800 text-sm px-5 py-4 rounded-2xl border border-slate-200 outline-none shadow-sm cursor-pointer flex items-center justify-between group hover:border-blueprint-blue transition-colors"
      >
        <span className={value ? 'text-slate-900 dark:text-gray-100 font-bold' : 'text-slate-400'}>
          {value || placeholder}
        </span>
        <ChevronDown size={18} className={`text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute z-[100] w-full mt-2 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="p-3 border-b border-slate-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                type="text"
                autoFocus
                placeholder={placeholder || "Search..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-gray-900 border-none rounded-xl text-xs outline-none focus:ring-1 ring-blueprint-blue"
                onClick={(e) => e.stopPropagation()}
              />
              {searchTerm && (
                <button 
                  onClick={(e) => { e.stopPropagation(); setSearchTerm(''); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto custom-scrollbar">
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                No matches found
              </div>
            ) : (
              filteredOptions.map((option) => (
                <div
                  key={option}
                  onClick={() => {
                    onChange(option);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  className={`px-5 py-3 text-sm cursor-pointer flex items-center justify-between hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors ${
                    value === option ? 'bg-blue-50 dark:bg-blue-900/20 text-blueprint-blue font-bold' : 'text-slate-700 dark:text-gray-300'
                  }`}
                >
                  {option}
                  {value === option && <Check size={14} />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
