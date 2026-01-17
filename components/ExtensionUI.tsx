import React, { useState, useMemo, useEffect } from 'react';
import { 
  Upload, Zap, Download, RefreshCcw, 
  Target, Copy, UserCircle, 
  ChevronRight, CheckCircle2, Layout, FileEdit, BarChart3,
  Trash2, AlertCircle, Sparkles, FileText, Check, ArrowRight
} from 'lucide-react';
// @ts-ignore
import mammoth from 'mammoth';
import { ResumeData, OptimizationResult, AppState, TemplateId } from '../types';
import { ResumeOptimizerService } from '../services/geminiService';
import { DocxGenerator, TEMPLATES } from '../services/docxGenerator';
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
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>('modern');
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
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden">
      {/* Header - Fixed Height Container */}
      <header className="flex-none glass p-4 flex justify-between items-center z-[100]">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center" style={{ width: '42px', height: '42px', background: 'linear-gradient(135deg, var(--brand-600), var(--violet-600))', borderRadius: '14px', boxShadow: '0 8px 20px rgba(79, 70, 229, 0.25)' }}>
            <Zap size={22} color="white" fill="rgba(255,255,255,0.3)" />
          </div>
          <div className="flex flex-col">
            <h1 className="font-extrabold m-0" style={{ fontSize: '1.1rem', lineHeight: '1.1', letterSpacing: '-0.02em' }}>CareerAgent</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="status-dot animate-pulse"></span>
              <span className="uppercase tracking-widest font-bold" style={{ fontSize: '9px', color: 'var(--brand-600)' }}>AI ENGINE READY</span>
            </div>
          </div>
        </div>
        {parsedMasterResume && (
          <button onClick={() => setAppState(AppState.PROFILE)} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '12px', padding: '10px', cursor: 'pointer', display: 'flex', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <UserCircle size={20} color="var(--brand-600)" />
          </button>
        )}
      </header>

      {/* Main Content Area - Fixed flex-1 with overflow auto */}
      <main className="flex-1 overflow-y-auto custom-scrollbar min-h-0 bg-slate-50/50">
        <div className="p-6">
          {/* Setup Phase */}
          {appState === AppState.SETUP && (
            <div className="animate-slide-up flex flex-col gap-10 mt-4">
              <div className="flex flex-col gap-3">
                <h2 className="font-extrabold m-0" style={{ fontSize: '2.2rem', lineHeight: '1.1', color: 'var(--text-main)', letterSpacing: '-0.04em' }}>
                  Master the <br/><span style={{ background: 'linear-gradient(135deg, var(--brand-600), var(--violet-600))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Job Market.</span>
                </h2>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 500, maxWidth: '85%' }}>Upload your base resume to instantly tailor your profile for every application.</p>
              </div>

              <div className="card p-10 text-center relative group" style={{ borderStyle: 'dashed', background: 'white', borderWidth: '2px', borderColor: 'var(--brand-200)' }}>
                <input type="file" id="resume-up" className="absolute" style={{ opacity: 0, cursor: 'pointer', inset: 0, zIndex: 10 }} onChange={handleFileUpload} accept=".pdf,.docx,.txt" />
                <div className="flex flex-col items-center gap-6">
                  <div style={{ padding: '24px', borderRadius: '28px', backgroundColor: 'var(--brand-50)', transform: 'scale(1)', transition: 'all 0.3s' }}>
                    <Upload size={40} color="var(--brand-600)" />
                  </div>
                  <div>
                    <h3 className="font-bold m-0" style={{ fontSize: '1.1rem' }}>Upload Master Resume</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px' }}>PDF, DOCX, or Text (Max 5MB)</p>
                  </div>
                </div>
              </div>

              {isProcessing && (
                <div className="flex items-center justify-center gap-4 p-6 animate-pulse" style={{ background: 'var(--brand-50)', borderRadius: '1.5rem', border: '1px solid var(--brand-100)' }}>
                  <RefreshCcw size={20} className="animate-spin" color="var(--brand-600)" />
                  <span className="font-bold uppercase tracking-widest" style={{ fontSize: '0.75rem', color: 'var(--brand-600)' }}>PARSING INTELLIGENCE...</span>
                </div>
              )}
              {error && <div className="p-5" style={{ backgroundColor: '#fff1f2', border: '1px solid #fee2e2', borderRadius: '1.5rem', color: '#e11d48', fontSize: '0.8rem', fontWeight: 700, display: 'flex', gap: '12px', alignItems: 'center' }}>
                <AlertCircle size={20} /> {error}
              </div>}
            </div>
          )}

          {/* Profile Phase */}
          {appState === AppState.PROFILE && parsedMasterResume && (
            <div className="animate-slide-up flex flex-col gap-6">
              <div className="card p-8 text-center flex flex-col items-center gap-6 relative overflow-hidden">
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '100px', background: 'linear-gradient(135deg, var(--brand-50), var(--brand-100))', opacity: 0.6 }}></div>
                <div className="relative" style={{ marginTop: '30px' }}>
                  <div style={{ width: '100px', height: '100px', background: 'linear-gradient(135deg, var(--brand-600), var(--violet-600))', borderRadius: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 15px 30px rgba(79, 70, 229, 0.35)', transform: 'rotate(6deg)' }}>
                    <UserCircle size={52} color="white" />
                  </div>
                  <div style={{ position: 'absolute', bottom: '-4px', right: '-4px', background: 'var(--emerald-500)', borderRadius: '14px', padding: '5px', border: '4px solid white', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                    <CheckCircle2 size={18} color="white" />
                  </div>
                </div>
                <div>
                  <h3 className="font-extrabold m-0" style={{ fontSize: '1.4rem', letterSpacing: '-0.02em' }}>{parsedMasterResume.fullName}</h3>
                  <span className="uppercase font-bold tracking-widest mt-1.5" style={{ fontSize: '10px', color: 'var(--brand-600)', background: 'var(--brand-50)', padding: '4px 12px', borderRadius: '100px', display: 'inline-block' }}>VERIFIED PROFILE ACTIVE</span>
                </div>

                <button onClick={handleScrapeAndOptimize} disabled={isProcessing} className="btn-primary w-full" style={{ padding: '1.5rem' }}>
                  {isProcessing ? <RefreshCcw className="animate-spin" size={24} /> : <Sparkles size={24} fill="rgba(255,255,255,0.3)" />}
                  {isProcessing ? 'SYNCHRONIZING...' : 'MATCH CURRENT PAGE'}
                </button>

                <button onClick={clearProfile} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', cursor: 'pointer', display: 'flex', alignItems: 'center', opacity: 0.6 }}>
                  <Trash2 size={14} style={{ marginRight: '8px' }} /> RESET MASTER DATA
                </button>
              </div>

              {/* Skills/Experience Cards - Fixed alignment to left */}
              <div className="flex gap-4">
                <div className="card p-6 flex-1 flex flex-col items-start bg-white shadow-sm border-slate-100">
                  <span className="uppercase font-bold text-muted" style={{ fontSize: '0.65rem', letterSpacing: '0.08em', marginBottom: '12px' }}>SKILLS FOUND</span>
                  <p className="font-extrabold m-0" style={{ fontSize: '2.5rem', color: 'var(--brand-600)', lineHeight: '1' }}>{parsedMasterResume.skills?.length || 0}</p>
                </div>
                <div className="card p-6 flex-1 flex flex-col items-start bg-white shadow-sm border-slate-100">
                  <span className="uppercase font-bold text-muted" style={{ fontSize: '0.65rem', letterSpacing: '0.08em', marginBottom: '12px' }}>EXPERIENCE</span>
                  <div className="flex items-baseline gap-2">
                    <p className="font-extrabold m-0" style={{ fontSize: '2.5rem', color: 'var(--brand-600)', lineHeight: '1' }}>{parsedMasterResume.experience?.length || 0}</p>
                    <span className="font-bold text-muted" style={{ fontSize: '0.75rem' }}>ROLES</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Manual Input Fallback */}
          {appState === AppState.JOB_INPUT && (
            <div className="animate-slide-up flex flex-col gap-6">
              <div className="card p-8 flex flex-col gap-5">
                <div className="flex items-center gap-4">
                   <div className="p-4 rounded-2xl bg-indigo-50">
                     <Layout size={24} color="var(--brand-600)" />
                   </div>
                   <div>
                     <h4 className="font-bold m-0" style={{ fontSize: '1.1rem' }}>Paste Job Description</h4>
                     <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>We couldn't auto-detect the job details.</p>
                   </div>
                </div>
                <textarea 
                  value={jobDescription}
                  onChange={e => setJobDescription(e.target.value)}
                  placeholder="Paste the full job details here for analysis..."
                  style={{ width: '100%', height: '240px', padding: '1.25rem', border: '1px solid var(--border)', borderRadius: '1.5rem', fontSize: '0.9rem', outline: 'none', resize: 'none', background: 'var(--bg)', color: 'var(--text-main)', lineHeight: '1.6' }}
                />
                <button onClick={() => runOptimization(jobDescription)} className="btn-primary" style={{ padding: '1.25rem' }}>
                  GENERATE OPTIMIZED RESUME <ArrowRight size={18} />
                </button>
              </div>
            </div>
          )}

          {/* Optimizing State */}
          {appState === AppState.OPTIMIZING && (
            <div className="py-24 text-center animate-slide-up flex flex-col items-center gap-8">
              <div className="relative">
                <div style={{ width: '100px', height: '100px', border: '5px solid var(--brand-100)', borderTopColor: 'var(--brand-600)', borderRadius: '50%' }} className="animate-spin"></div>
                <Sparkles className="absolute animate-pulse" size={32} color="var(--brand-600)" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
              </div>
              <div className="flex flex-col gap-2 px-6">
                <h3 className="font-extrabold m-0" style={{ fontSize: '1.4rem', letterSpacing: '-0.03em' }}>Tailoring Content...</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>Our AI agent is matching your skills to the specific job requirements for maximum ATS visibility.</p>
              </div>
            </div>
          )}

          {/* Completed Results */}
          {appState === AppState.COMPLETED && optimizationResult && editableResume && (
            <div className="animate-slide-up flex flex-col gap-8 pb-10">
              <div className="score-display">
                <div className="flex justify-between items-center relative z-10">
                  <div>
                    <p className="uppercase font-bold tracking-widest m-0" style={{ fontSize: '0.7rem', opacity: 0.9 }}>ATS MATCH CONFIDENCE</p>
                    <h2 className="font-extrabold m-0 mt-1" style={{ fontSize: '3.8rem', letterSpacing: '-4px', lineHeight: '1' }}>{optimizationResult.optimizedScore}%</h2>
                    <div className="flex items-center gap-2 mt-4">
                      <span style={{ background: 'rgba(255,255,255,0.25)', padding: '6px 14px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 800, border: '1px solid rgba(255,255,255,0.2)' }}>
                        +{optimizationResult.optimizedScore - (optimizationResult.originalScore || 0)}% BOOST APPLIED
                      </span>
                    </div>
                  </div>
                  <div style={{ width: '85px', height: '85px', background: 'rgba(255,255,255,0.15)', borderRadius: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(255,255,255,0.3)', fontSize: '2.2rem', fontWeight: 900, boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.1)' }}>
                    A+
                  </div>
                </div>
              </div>

              {/* Template Selection */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between px-1">
                  <p className="uppercase font-bold tracking-widest text-muted m-0" style={{ fontSize: '11px' }}>VISUAL RESUME STYLE</p>
                  <span style={{ fontSize: '11px', color: 'var(--brand-600)', fontWeight: 800 }}>{TEMPLATES[selectedTemplate].name} SELECTED</span>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-4 custom-scrollbar">
                   {(Object.keys(TEMPLATES) as TemplateId[]).map(tid => (
                     <button 
                      key={tid} 
                      onClick={() => setSelectedTemplate(tid)}
                      style={{ 
                        flexShrink: 0, 
                        padding: '16px 20px', 
                        borderRadius: '1.5rem', 
                        border: selectedTemplate === tid ? '2px solid var(--brand-600)' : '1px solid var(--border)',
                        background: selectedTemplate === tid ? 'white' : 'transparent',
                        boxShadow: selectedTemplate === tid ? '0 10px 20px rgba(79, 70, 229, 0.1)' : 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        minWidth: '120px',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}
                     >
                       <span style={{ fontSize: '0.95rem', fontWeight: 800, color: selectedTemplate === tid ? 'var(--brand-600)' : 'var(--text-main)' }}>{TEMPLATES[tid].name.split(' ')[0]}</span>
                       <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: selectedTemplate === tid ? 'var(--brand-600)' : 'var(--brand-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: selectedTemplate === tid ? 'none' : '1px solid var(--border)' }}>
                         {selectedTemplate === tid ? <Check size={12} color="white" strokeWidth={3} /> : null}
                       </div>
                     </button>
                   ))}
                </div>
              </div>

              <div className="flex p-2" style={{ background: 'var(--brand-100)', borderRadius: '1.5rem' }}>
                <button onClick={() => setActiveTab('resume')} className={`tab-button ${activeTab === 'resume' ? 'active' : ''}`}>RESUME</button>
                <button onClick={() => setActiveTab('cover')} className={`tab-button ${activeTab === 'cover' ? 'active' : ''}`}>LETTER</button>
                <button onClick={() => setActiveTab('diff')} className={`tab-button ${activeTab === 'diff' ? 'active' : ''}`}>ANALYSIS</button>
              </div>

              {activeTab === 'resume' && (
                <div className="card p-8 flex flex-col gap-6 animate-slide-up bg-white">
                  <div className="flex items-center gap-3 pb-5" style={{ borderBottom: '1px solid var(--border)' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '12px', background: 'var(--brand-50)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FileEdit size={18} color="var(--brand-600)" />
                    </div>
                    <h4 className="font-extrabold m-0" style={{ fontSize: '1rem' }}>Optimized Profile Content</h4>
                  </div>
                  <div className="flex flex-col gap-5">
                    <div style={{ background: 'var(--bg)', padding: '1.5rem', borderRadius: '1.5rem', border: '1px solid var(--border)' }}>
                      <span className="uppercase font-bold" style={{ fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>TARGETED SUMMARY</span>
                      <p style={{ fontSize: '0.85rem', lineHeight: '1.7', marginTop: '12px', color: 'var(--text-main)', fontWeight: 500 }}>{editableResume.summary}</p>
                    </div>
                    <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1.5rem', border: '1px solid var(--brand-100)', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.05)' }}>
                      <span className="uppercase font-bold" style={{ fontSize: '0.65rem', color: 'var(--brand-600)', letterSpacing: '0.05em' }}>KEYWORD INJECTIONS</span>
                      <div className="flex flex-wrap gap-2.5 mt-4">
                        {optimizationResult.analysis.keywordGaps.slice(0, 10).map((k, i) => (
                          <span key={i} style={{ background: 'var(--brand-50)', color: 'var(--brand-600)', padding: '6px 14px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 800, border: '1px solid var(--brand-100)' }}>
                            {k}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'cover' && (
                <div className="card p-8 animate-slide-up bg-white">
                  <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-4">
                      <div style={{ width: '36px', height: '36px', borderRadius: '12px', background: 'var(--brand-50)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FileText size={18} color="var(--brand-600)" />
                      </div>
                      <h4 className="font-extrabold m-0" style={{ fontSize: '1rem' }}>Generated Letter</h4>
                    </div>
                    <button onClick={() => navigator.clipboard.writeText(optimizationResult.coverLetter)} style={{ background: 'var(--brand-50)', border: 'none', borderRadius: '14px', padding: '12px', cursor: 'pointer', display: 'flex', transition: 'all 0.2s' }} className="hover:scale-110 active:scale-95">
                      <Copy size={18} color="var(--brand-600)" />
                    </button>
                  </div>
                  <div style={{ fontSize: '0.85rem', lineHeight: '1.9', color: 'var(--text-main)', fontStyle: 'normal', background: 'var(--bg)', padding: '2rem', borderRadius: '1.5rem', border: '1px dashed var(--border)', whiteSpace: 'pre-wrap', fontWeight: 500 }}>
                    {optimizationResult.coverLetter}
                  </div>
                </div>
              )}

              {activeTab === 'diff' && (
                 <div className="animate-slide-up flex flex-col gap-4" style={{ minHeight: '500px' }}>
                    <div className="card p-8 bg-slate-900 text-white">
                      <h4 className="font-extrabold m-0 mb-2" style={{ fontSize: '1rem' }}>Strategic Changes</h4>
                      <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>Visual diff highlighting AI enhancements vs your master record.</p>
                      <div className="mt-6">
                        <DiffView original={masterResumeRaw} optimized={JSON.stringify(editableResume, null, 2)} />
                      </div>
                    </div>
                 </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Footer - Fixed Position (NOT ABSOLUTE) within the flex container */}
      {appState === AppState.COMPLETED && (
        <footer className="flex-none p-4 pb-8 bg-white border-t border-slate-200 z-[1000] shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
          <div className="flex gap-4">
            <button 
              onClick={() => setAppState(AppState.PROFILE)} 
              style={{ 
                width: '64px', 
                height: '64px', 
                background: 'white', 
                border: '1px solid var(--border)', 
                borderRadius: '1.25rem', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                cursor: 'pointer', 
                transition: 'all 0.2s',
                boxShadow: '0 4px 12px rgba(0,0,0,0.04)'
              }} 
              className="hover:bg-slate-50 active:scale-95"
            >
              <RefreshCcw size={28} color="var(--text-muted)" />
            </button>
            <button 
              onClick={async () => {
                if (!editableResume) return;
                setIsProcessing(true);
                try {
                  const blob = await docxGenerator.generate(editableResume, selectedTemplate);
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url; a.download = `Tailored_${selectedTemplate}_Resume.docx`;
                  a.click();
                  URL.revokeObjectURL(url);
                } finally {
                  setIsProcessing(false);
                }
              }}
              disabled={isProcessing}
              className="btn-primary" 
              style={{ flex: 1, height: '64px', borderRadius: '1.25rem' }}
            >
              {isProcessing ? <RefreshCcw className="animate-spin" size={24} /> : <Download size={24} />}
              <div className="flex flex-col items-start gap-0">
                 <span className="uppercase tracking-widest font-extrabold" style={{ fontSize: '0.8rem' }}>
                   {isProcessing ? 'GENERATING...' : 'DOWNLOAD RESUME'}
                 </span>
                 {!isProcessing && <span style={{ fontSize: '0.65rem', opacity: 0.8, fontWeight: 700 }}>{TEMPLATES[selectedTemplate].name.toUpperCase()} STYLE</span>}
              </div>
            </button>
          </div>
        </footer>
      )}
    </div>
  );
};

export default ExtensionUI;