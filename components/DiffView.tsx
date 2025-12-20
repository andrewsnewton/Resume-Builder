
import React, { useMemo } from 'react';
// @ts-ignore
import * as Diff from 'diff';

interface DiffViewProps {
  original: string;
  optimized: string;
}

const DiffView: React.FC<DiffViewProps> = ({ original, optimized }) => {
  const diff = useMemo(() => {
    // Using diffWords for better granularity in text-heavy resumes, or diffLines for structural changes
    return Diff.diffWords(original, optimized);
  }, [original, optimized]);

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar font-mono text-[10px] leading-relaxed p-4 bg-slate-950/50 rounded-xl border border-slate-800 shadow-inner">
      <div className="whitespace-pre-wrap break-words">
        {diff.map((part: any, index: number) => {
          if (part.added) {
            return (
              <span key={index} className="bg-emerald-900/60 text-emerald-200 border-b-2 border-emerald-500/50 px-0.5 rounded-sm">
                {part.value}
              </span>
            );
          }
          if (part.removed) {
             return (
               <span key={index} className="bg-red-900/40 text-red-300 line-through opacity-60 decoration-red-500/50 px-0.5">
                 {part.value}
               </span>
             );
          }
          return (
            <span key={index} className="text-slate-500 opacity-60">
              {part.value}
            </span>
          );
        })}
      </div>
    </div>
  );
};

export default DiffView;
