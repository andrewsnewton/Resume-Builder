import React, { useState, useMemo, useEffect } from 'react';
import { 
  Upload, Zap, Download, RefreshCcw, 
  Target, Copy, UserCircle, 
  ChevronRight, CheckCircle2, Layout, FileEdit, BarChart3,
  Trash2, AlertCircle, Sparkles, FileText
} from 'lucide-react';
// @ts-ignore
import mammoth from 'mammoth';
import { ResumeData, OptimizationResult, AppState } from '../types';
import { ResumeOptimizerService } from '../services/geminiService';
import { DocxGenerator } from '../services/docxGenerator';
import DiffView from './DiffView';

declare const chrome: any;

const utf8ToBase64 = (str: string): string => {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

const ExtensionUI: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.SETUP);
  const [masterResumeRaw, setMasterResumeRaw] = useState<string>('');
  const [parsedMasterResume, setParsedMasterResume] = useState<ResumeData | null>(null);
  const [jobDescription, setJobDescription] = useState<string>("");
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  const [editableResume, setEditableResume] = useState<ResumeData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'resume' | 'cover' | 'diff'>('resume');

  const optimizerService = useMemo(() => new ResumeOptimizerService(), []);
  const docxGenerator = useMemo(() => new DocxGenerator(), []);

  useEffect(() => {
    const savedResume = localStorage.getItem('master_resume_data');
    const savedRaw = localStorage.getItem('master_resume_raw');
    if (savedResume && savedRaw) {
      setParsedMasterResume(JSON.parse(savedResume));
      setMasterResumeRaw(savedRaw);
      setAppState(AppState.PROFILE);
    }
  }, []);

  const saveProfile = (data: ResumeData, raw: string) => {
    localStorage.setItem('master_resume_data', JSON.stringify(data));
    localStorage.setItem('master_resume_raw', raw);
    setParsedMasterResume(data);
    setMasterResumeRaw(raw);
    setAppState(AppState.PROFILE);
  };

  const clearProfile = () => {
    localStorage.removeItem('master_resume_data');
    localStorage.removeItem('master_resume_raw');
    setParsedMasterResume(null);
    setMasterResumeRaw('');
    setAppState(AppState.SETUP);
  };

  const handleScrapeAndOptimize = async () => {
    setIsProcessing(true);
    setError(null);
    if (typeof chrome !== "undefined" && chrome.scripting) {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab || tab.url.startsWith('chrome:')) throw new Error("Restricted page");
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            const selectors = ['.jobs-description-content', '#jobDescriptionText', '.job-description', 'article', 'main'];
            for (const s of selectors) {
              const el = document.querySelector(s) as HTMLElement;
              if (el && el.innerText.trim().length > 200) return el.innerText.trim();
            }
            return document.body.innerText.length > 500 ? document.body.innerText : null;
          }
        });
        if (results && results[0]?.result) {
          setJobDescription(results[0].result);
          await runOptimization(results[0].result);
        } else {
          setAppState(AppState.JOB_INPUT);
          setError("Detection failed. Please paste details.");
        }
      } catch (err) {
        setAppState(AppState.JOB_INPUT);
      } finally { setIsProcessing(false); }
    } else { setAppState(AppState.JOB_INPUT); setIsProcessing(false); }
  };

  const runOptimization = async (jd: string) => {
    if (!parsedMasterResume) return;
    setIsProcessing(true);
    setAppState(AppState.OPTIMIZING);
    try {
      const result = await optimizerService.optimizeResume(JSON.stringify(parsedMasterResume), jd);
      setOptimizationResult(result);
      setEditableResume(result.optimizedResume);
      setAppState(AppState.COMPLETED);
    } catch (err) {
      setError("Analysis failed. Try again.");
      setAppState(AppState.JOB_INPUT);
    } finally { setIsProcessing(false); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    setError(null);
    try {
      if (file.name.endsWith(".pdf")) {
        const reader = new FileReader();
        const base64 = await new Promise<string>(res => {
          reader.onload = () => res((reader.result as string).split(',')[1]);
          reader.readAsDataURL(file);
        });
        const data = await optimizerService.parseResume({ mimeType: "application/pdf", data: base64 });
        saveProfile(data, JSON.stringify(data));
      } else if (file.name.endsWith(".docx")) {
        const buffer = await file.arrayBuffer();
        const { value } = await mammoth.extractRawText({ arrayBuffer: buffer });
        const data = await optimizerService.parseResume({ mimeType: 'text/plain', data: utf8ToBase64(value) });
        saveProfile(data, value);
      } else {
        const text = await file.text();
        const data = await optimizerService.parseResume({ mimeType: 'text/plain', data: utf8ToBase64(text) });
        saveProfile(data, text);
      }
    } catch (err) { setError("Parsing failed."); } finally { setIsProcessing(false); }
  };

  return (
    <div className="h-full flex flex-col bg-[#f8fafc] relative overflow-hidden text-slate-900 font-sans">
      {/* Dynamic Header */}
      <header className="glass sticky top-0 z-50 px-6 py-4 flex justify-between items-center border-b border-slate-200/60 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200/50">
            <Zap className="w-5 h-5 text-white fill-white/20" />
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight text-slate-900 m-0 leading-tight">CareerAgent</h1>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
              <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest m-0 leading-tight">ATS Logic Active</p>
            </div>
          </div>
        </div>
        {parsedMasterResume && (
          <button 
            onClick={() => setAppState(AppState.PROFILE)} 
            className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center hover:bg-indigo-50 hover:text-indigo-600 transition-all active:scale-90 shadow-sm"
            title="My Profile"
          >
            <UserCircle className="w-6 h-6" />
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        {/* Setup Phase */}
        {appState === AppState.SETUP && (
          <div className="space-y-10 mt-4 animate-slide-up">
            <div className="space-y-3">
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 leading-[1.15]">
                Tailor your <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">future in seconds.</span>
              </h2>
              <p className="text-[13px] text-slate-500 font-medium max-w-[280px]">Upload your master resume once, and we'll optimize it for every job you see.</p>
            </div>
            
            <div className="relative group">
              <input type="file" id="resume-up" className="hidden" onChange={handleFileUpload} accept=".pdf,.docx,.txt" />
              <label htmlFor="resume-up" className="block cursor-pointer">
                <div className="border-2 border-dashed border-slate-200 rounded-[2.5rem] p-12 bg-white text-center hover:border-indigo-500 hover:bg-indigo-50/20 transition-all duration-300 shadow-premium group-active:scale-[0.98]">
                  <div className="w-20 h-20 bg-gradient-to-br from-indigo-50 to-violet-50 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-inner">
                    <Upload className="w-9 h-9 text-indigo-600" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">Select Resume</h3>
                  <p className="text-xs text-slate-400 font-medium mt-1.5">PDF, Word, or Text (Max 5MB)</p>
                </div>
              </label>
            </div>

            {isProcessing && (
              <div className="flex flex-col items-center justify-center gap-4 py-6 bg-indigo-50/50 rounded-3xl border border-indigo-100/50 animate-pulse">
                <RefreshCcw className="w-6 h-6 text-indigo-600 animate-spin" />
                <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-[0.15em]">Parsing Resume Intelligence...</span>
              </div>
            )}
            {error && (
              <div className="p-5 bg-red-50 border border-red-100 rounded-[2rem] text-[12px] text-red-600 font-bold flex items-center gap-4 shadow-sm">
                <div className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                {error}
              </div>
            )}
          </div>
        )}

        {/* Profile Dashboard */}
        {appState === AppState.PROFILE && parsedMasterResume && (
          <div className="space-y-8 mt-2 animate-slide-up">
            <div className="bg-white rounded-[2.5rem] p-8 shadow-premium border border-slate-100 text-center space-y-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-br from-indigo-600/5 to-violet-600/5 pointer-events-none"></div>
              
              <div className="relative z-10 space-y-6">
                <div className="relative inline-block">
                  <div className="w-28 h-28 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl shadow-indigo-200 rotate-6 hover:rotate-0 transition-all duration-500">
                    <UserCircle className="w-14 h-14 text-white" />
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-emerald-500 rounded-2xl border-4 border-white flex items-center justify-center shadow-lg">
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  </div>
                </div>
                
                <div>
                  <h3 className="text-2xl font-extrabold text-slate-900 m-0 tracking-tight">{parsedMasterResume.fullName}</h3>
                  <div className="inline-flex items-center gap-2 mt-2 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-bold uppercase tracking-widest border border-indigo-100">
                    Master Profile Verified
                  </div>
                </div>

                <div className="space-y-4">
                  <button 
                    onClick={handleScrapeAndOptimize}
                    disabled={isProcessing}
                    className="w-full py-5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl font-bold text-sm shadow-xl shadow-indigo-200/50 hover:shadow-indigo-300/50 hover:-translate-y-1 transition-all active:scale-95 disabled:opacity-50 btn-shine flex items-center justify-center gap-3"
                  >
                    {isProcessing ? (
                      <RefreshCcw className="w-5 h-5 animate-spin" />
                    ) : (
                      <Sparkles className="w-5 h-5 fill-white/20" />
                    )}
                    {isProcessing ? 'Thinking...' : 'Match to Current Job'}
                  </button>

                  <button onClick={clearProfile} className="text-[11px] font-bold text-slate-400 uppercase tracking-widest hover:text-red-500 transition-colors flex items-center justify-center gap-2 mx-auto pt-2">
                    <Trash2 className="w-4 h-4" /> Reset Master Data
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm hover:border-indigo-200 transition-colors">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center mb-4">
                  <Sparkles className="w-5 h-5 text-indigo-600" />
                </div>
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Skills Found</span>
                <p className="text-lg font-extrabold mt-1 text-slate-900">{parsedMasterResume.skills?.length || 0}</p>
              </div>
              <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm hover:border-violet-200 transition-colors">
                <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center mb-4">
                  <BarChart3 className="w-5 h-5 text-violet-600" />
                </div>
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Experience</span>
                <p className="text-lg font-extrabold mt-1 text-slate-900">{parsedMasterResume.experience?.length || 0} Roles</p>
              </div>
            </div>
          </div>
        )}

        {/* Manual Input Fallback */}
        {appState === AppState.JOB_INPUT && (
          <div className="space-y-6 animate-slide-up">
            <div className="bg-white rounded-[2.5rem] p-8 shadow-premium border border-slate-100 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center shrink-0">
                  <Layout className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h4 className="text-base font-extrabold m-0">Paste Job Details</h4>
                  <p className="text-xs text-slate-400 font-medium">Automatic detection failed on this page.</p>
                </div>
              </div>
              <textarea 
                value={jobDescription}
                onChange={e => setJobDescription(e.target.value)}
                placeholder="Paste the full job description here..."
                className="w-full h-64 p-6 text-[13px] font-medium border border-slate-100 rounded-[2rem] bg-slate-50 focus:ring-4 focus:ring-indigo-100/50 focus:bg-white focus:border-indigo-200 transition-all outline-none resize-none custom-scrollbar leading-relaxed"
              />
            </div>
            <button 
              onClick={() => runOptimization(jobDescription)}
              disabled={!jobDescription.trim()}
              className="w-full py-5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-[2rem] font-bold text-sm shadow-xl shadow-indigo-100 hover:shadow-indigo-200 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-3 disabled:bg-slate-200 active:scale-95"
            >
              Tailor My Resume <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Optimizing State */}
        {appState === AppState.OPTIMIZING && (
          <div className="py-24 text-center space-y-10 animate-slide-up">
            <div className="relative inline-block">
              <div className="w-24 h-24 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 bg-indigo-50 rounded-3xl flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-indigo-600 animate-pulse" />
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">AI Agent Working</h3>
              <p className="text-[13px] text-slate-500 font-medium px-10">Matching your experience to top job keywords for peak ATS performance.</p>
            </div>
          </div>
        )}

        {/* Result State */}
        {appState === AppState.COMPLETED && optimizationResult && editableResume && (
          <div className="space-y-6 animate-slide-up pb-32">
            <div className="bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-700 rounded-[2.5rem] p-10 text-white shadow-2xl shadow-indigo-200 flex items-center justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
              <div className="relative z-10">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] opacity-80 mb-2">Target Match Score</p>
                <h2 className="text-5xl font-black m-0 tracking-tighter">{optimizationResult.optimizedScore}%</h2>
                <div className="flex items-center gap-2 mt-4">
                  <span className="px-3 py-1 bg-white/20 rounded-full text-[10px] font-bold border border-white/10">
                    +{optimizationResult.optimizedScore - (optimizationResult.originalScore || 0)}% Boost
                  </span>
                </div>
              </div>
              <div className="relative z-10 w-24 h-24 bg-white/10 rounded-[2.5rem] border-2 border-white/20 flex items-center justify-center text-3xl font-black shadow-inner">
                A+
              </div>
            </div>

            <nav className="flex bg-white p-2 rounded-2xl shadow-sm border border-slate-200/50">
              {[
                { id: 'resume', icon: FileEdit, label: 'Resume' },
                { id: 'cover', icon: FileText, label: 'Letter' },
                { id: 'diff', icon: BarChart3, label: 'Gaps' }
              ].map(tab => (
                <button 
                  key={tab.id} 
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 py-4 flex items-center justify-center gap-3 text-[11px] font-bold uppercase tracking-wider rounded-xl transition-all ${activeTab === tab.id ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg' : 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-50/50'}`}
                >
                  <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-white' : 'text-slate-400'}`} /> {tab.label}
                </button>
              ))}
            </nav>

            {activeTab === 'resume' && (
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-premium space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-5">
                  <h4 className="text-sm font-extrabold text-slate-900 m-0 flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Analysis Complete
                  </h4>
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold border border-emerald-100">Optimized</span>
                </div>
                
                <div className="space-y-4">
                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white transition-colors">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Strategic Summary</span>
                    <p className="text-[13px] leading-relaxed text-slate-700 mt-2.5 font-medium">{editableResume.summary}</p>
                  </div>
                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white transition-colors">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Injected Keywords</span>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {optimizationResult.analysis.keywordGaps.slice(0, 8).map((k, i) => (
                        <span key={i} className="px-3 py-1.5 bg-white text-indigo-600 rounded-xl text-[10px] font-bold border border-indigo-100 shadow-sm">
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'cover' && (
              <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-premium">
                <div className="flex justify-between items-center mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                       <FileText className="w-5 h-5 text-indigo-600" />
                    </div>
                    <h4 className="text-sm font-extrabold text-slate-900 m-0">Cover Letter</h4>
                  </div>
                  <button onClick={() => navigator.clipboard.writeText(optimizationResult.coverLetter)} className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 active:scale-90 transition-all shadow-sm">
                    <Copy className="w-5 h-5" />
                  </button>
                </div>
                <div className="text-[13px] leading-[1.7] whitespace-pre-wrap font-medium text-slate-600 bg-slate-50/50 p-8 rounded-[2rem] border border-slate-100 border-dashed">
                  {optimizationResult.coverLetter}
                </div>
              </div>
            )}

            {activeTab === 'diff' && (
              <div className="h-[550px] flex flex-col animate-slide-up">
                <div className="bg-slate-900 p-4 rounded-t-[2.5rem] border-b border-white/10">
                   <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest px-2">Diff Comparison Mode</p>
                </div>
                <DiffView original={masterResumeRaw} optimized={JSON.stringify(editableResume, null, 2)} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Persistent Footer Actions */}
      {appState === AppState.COMPLETED && (
        <div className="absolute bottom-0 left-0 right-0 p-8 bg-white/90 backdrop-blur-2xl border-t border-slate-200/50 flex gap-4 z-50">
           <button 
             onClick={() => setAppState(AppState.PROFILE)} 
             className="w-16 h-16 bg-white border border-slate-200 text-slate-500 rounded-[1.5rem] flex items-center justify-center hover:bg-slate-50 hover:text-indigo-600 transition-all active:scale-95 shadow-sm"
           >
              <RefreshCcw className="w-6 h-6" />
           </button>
           <button 
            onClick={async () => {
              if (!editableResume) return;
              const blob = await docxGenerator.generate(editableResume, 'modern');
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url; a.download = `Optimized_Resume_${Date.now()}.docx`;
              a.click();
            }}
            className="flex-1 py-5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-[1.5rem] font-extrabold text-sm uppercase tracking-widest shadow-xl shadow-indigo-200 hover:shadow-indigo-300 hover:-translate-y-1 transition-all flex items-center justify-center gap-4 btn-shine active:scale-[0.98]"
           >
              <Download className="w-5 h-5" /> Download Result
           </button>
        </div>
      )}
    </div>
  );
};

export default ExtensionUI;