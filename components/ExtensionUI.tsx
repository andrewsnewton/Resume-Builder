import React, { useState, useMemo, useEffect } from 'react';
import { 
  Upload, Zap, Download, RefreshCcw, 
  Target, Copy, ClipboardPaste, UserCircle, 
  ArrowRight, AlertCircle, FileText, Trash2,
  ChevronRight, CheckCircle2, Layout, FileEdit, BarChart3
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
    <div className="h-full flex flex-col bg-slate-50 relative overflow-hidden text-slate-900">
      {/* Dynamic Header */}
      <header className="glass sticky top-0 z-50 px-6 py-4 flex justify-between items-center border-b border-slate-200/60 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-indigo-200 shadow-lg">
            <Zap className="w-5 h-5 text-white fill-white/20" />
          </div>
          <div>
            <h1 className="text-sm font-extrabold tracking-tight text-slate-900 m-0 leading-tight">CareerAgent</h1>
            <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest m-0 leading-tight">ATS Intelligence</p>
          </div>
        </div>
        {parsedMasterResume && (
          <button 
            onClick={() => setAppState(AppState.PROFILE)} 
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-indigo-50 hover:text-indigo-600 transition-all active:scale-90"
            title="My Profile"
          >
            <UserCircle className="w-5 h-5" />
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        {/* Setup Phase */}
        {appState === AppState.SETUP && (
          <div className="space-y-8 mt-4 animate-slide-up">
            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Let's get you hired.</h2>
              <p className="text-sm text-slate-500 font-medium">Upload your base resume to start tailoring for roles instantly.</p>
            </div>
            
            <div className="relative group">
              <input type="file" id="resume-up" className="hidden" onChange={handleFileUpload} accept=".pdf,.docx,.txt" />
              <label htmlFor="resume-up" className="block cursor-pointer">
                <div className="border-2 border-dashed border-slate-200 rounded-[2.5rem] p-12 bg-white text-center hover:border-indigo-500 hover:bg-indigo-50/30 transition-all duration-300 shadow-premium group-active:scale-[0.98]">
                  <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:rotate-6 transition-transform">
                    <Upload className="w-8 h-8 text-indigo-600" />
                  </div>
                  <h3 className="text-base font-bold text-slate-800">Choose your resume</h3>
                  <p className="text-xs text-slate-400 font-medium mt-1">PDF, Word, or Text (Max 5MB)</p>
                </div>
              </label>
            </div>

            {isProcessing && (
              <div className="flex items-center justify-center gap-3 py-4 text-indigo-600 animate-pulse">
                <RefreshCcw className="w-5 h-5 animate-spin" />
                <span className="text-xs font-bold uppercase tracking-widest">Parsing Intelligence...</span>
              </div>
            )}
            {error && <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-[11px] text-red-600 font-bold flex items-center gap-3"><AlertCircle className="w-4 h-4" /> {error}</div>}
          </div>
        )}

        {/* Profile Dashboard */}
        {appState === AppState.PROFILE && parsedMasterResume && (
          <div className="space-y-8 mt-2 animate-slide-up">
            <div className="bg-white rounded-[2rem] p-8 shadow-premium border border-slate-100 text-center space-y-6">
              <div className="relative inline-block">
                <div className="w-24 h-24 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-indigo-100 rotate-3">
                  <UserCircle className="w-12 h-12 text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-emerald-500 rounded-full border-4 border-white flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                </div>
              </div>
              
              <div>
                <h3 className="text-xl font-extrabold text-slate-900 m-0">{parsedMasterResume.fullName}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Master Profile Active</p>
              </div>

              <button 
                onClick={handleScrapeAndOptimize}
                disabled={isProcessing}
                className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-bold text-sm shadow-xl shadow-indigo-100 hover:bg-indigo-700 hover:-translate-y-1 transition-all active:scale-95 disabled:opacity-50 btn-shine"
              >
                {isProcessing ? 'Analyzing Page...' : 'Optimize for Current Page'}
              </button>

              <button onClick={clearProfile} className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-red-500 transition-colors flex items-center justify-center gap-2 mx-auto">
                <Trash2 className="w-3.5 h-3.5" /> Reset Base Resume
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-100/50 p-4 rounded-3xl border border-slate-200/50">
                <span className="text-[9px] font-black uppercase text-slate-400">Skills</span>
                <p className="text-xs font-bold mt-1 text-slate-700">{parsedMasterResume.skills?.length || 0} Identified</p>
              </div>
              <div className="bg-slate-100/50 p-4 rounded-3xl border border-slate-200/50">
                <span className="text-[9px] font-black uppercase text-slate-400">Experience</span>
                <p className="text-xs font-bold mt-1 text-slate-700">{parsedMasterResume.experience?.length || 0} Roles</p>
              </div>
            </div>
          </div>
        )}

        {/* Manual Input Fallback */}
        {appState === AppState.JOB_INPUT && (
          <div className="space-y-6 animate-slide-up">
            <div className="bg-white rounded-[2rem] p-6 shadow-premium border border-slate-100 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-amber-50 rounded-xl flex items-center justify-center">
                  <Layout className="w-4 h-4 text-amber-600" />
                </div>
                <h4 className="text-sm font-extrabold m-0">Paste Job Details</h4>
              </div>
              <textarea 
                value={jobDescription}
                onChange={e => setJobDescription(e.target.value)}
                placeholder="Target Job Description..."
                className="w-full h-64 p-5 text-xs font-medium border border-slate-100 rounded-2xl bg-slate-50 focus:ring-4 focus:ring-indigo-50 focus:bg-white focus:border-indigo-200 transition-all outline-none resize-none custom-scrollbar leading-relaxed"
              />
            </div>
            <button 
              onClick={() => runOptimization(jobDescription)}
              disabled={!jobDescription.trim()}
              className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-bold text-sm shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 disabled:bg-slate-200 active:scale-95"
            >
              Start AI Optimization <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Optimizing State */}
        {appState === AppState.OPTIMIZING && (
          <div className="py-24 text-center space-y-8 animate-slide-up">
            <div className="relative inline-block">
              <div className="w-20 h-20 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mx-auto shadow-inner"></div>
              <Zap className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-indigo-600 animate-pulse" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-extrabold text-slate-900 uppercase tracking-tight">AI Agent Working</h3>
              <p className="text-xs text-slate-500 font-medium">Mapping keywords to your experience...</p>
            </div>
          </div>
        )}

        {/* Result State */}
        {appState === AppState.COMPLETED && optimizationResult && editableResume && (
          <div className="space-y-6 animate-slide-up pb-32">
            <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-[2.5rem] p-8 text-white shadow-xl shadow-indigo-100 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Estimated ATS Score</p>
                <h2 className="text-4xl font-black m-0">{optimizationResult.optimizedScore}%</h2>
                <div className="flex items-center gap-2 mt-2">
                  <div className="px-2 py-0.5 bg-white/20 rounded-full text-[9px] font-bold">+{optimizationResult.optimizedScore - (optimizationResult.originalScore || 0)}% Improvement</div>
                </div>
              </div>
              <div className="w-20 h-20 bg-white/10 rounded-full border-4 border-white/20 flex items-center justify-center text-xl font-black">
                A+
              </div>
            </div>

            <nav className="flex bg-slate-100 p-1.5 rounded-2xl shadow-inner-soft">
              {[
                { id: 'resume', icon: FileEdit, label: 'Resume' },
                { id: 'cover', icon: FileText, label: 'Letter' },
                { id: 'diff', icon: BarChart3, label: 'Changes' }
              ].map(tab => (
                <button 
                  key={tab.id} 
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 py-3 flex items-center justify-center gap-2 text-[10px] font-bold uppercase rounded-xl transition-all ${activeTab === tab.id ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500 hover:text-indigo-600'}`}
                >
                  <tab.icon className="w-3.5 h-3.5" /> {tab.label}
                </button>
              ))}
            </nav>

            {activeTab === 'resume' && (
              <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-premium space-y-4">
                <h4 className="text-[11px] font-black uppercase text-indigo-900 border-b pb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Tailored Content Ready
                </h4>
                <div className="space-y-3">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[9px] font-black uppercase text-slate-400">Smart Summary</span>
                    <p className="text-xs leading-relaxed text-slate-700 mt-2 font-medium">{editableResume.summary}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[9px] font-black uppercase text-slate-400">Added Keywords</span>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {optimizationResult.analysis.keywordGaps.slice(0, 6).map((k, i) => (
                        <span key={i} className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[9px] font-bold border border-indigo-100">+{k}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'cover' && (
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-premium">
                <div className="flex justify-between items-center mb-6">
                  <h4 className="text-[11px] font-black uppercase text-indigo-900 m-0 tracking-widest">Cover Letter</h4>
                  <button onClick={() => navigator.clipboard.writeText(optimizationResult.coverLetter)} className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 active:scale-90 transition-all">
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-[11px] leading-relaxed whitespace-pre-wrap font-medium text-slate-600 bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
                  {optimizationResult.coverLetter}
                </div>
              </div>
            )}

            {activeTab === 'diff' && (
              <div className="h-[500px] flex flex-col animate-slide-up">
                <DiffView original={masterResumeRaw} optimized={JSON.stringify(editableResume, null, 2)} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Persistent Footer Actions */}
      {appState === AppState.COMPLETED && (
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-xl border-t border-slate-200/60 flex gap-4 z-50">
           <button onClick={() => setAppState(AppState.PROFILE)} className="w-14 h-14 bg-slate-100 text-slate-600 rounded-2xl flex items-center justify-center hover:bg-slate-200 transition-all active:scale-95">
              <RefreshCcw className="w-5 h-5" />
           </button>
           <button 
            onClick={async () => {
              if (!editableResume) return;
              const blob = await docxGenerator.generate(editableResume, 'modern');
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url; a.download = `Tailored_Resume_${Date.now()}.docx`;
              a.click();
            }}
            className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-extrabold text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 btn-shine active:scale-[0.98]"
           >
              <Download className="w-4 h-4" /> Download DOCX
           </button>
        </div>
      )}
    </div>
  );
};

export default ExtensionUI;