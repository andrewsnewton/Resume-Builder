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
    <div className="h-full flex flex-col relative overflow-hidden">
      {/* Header */}
      <header className="glass p-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center" style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, var(--brand-600), var(--violet-600))', borderRadius: '12px', boxShadow: '0 8px 16px rgba(79, 70, 229, 0.2)' }}>
            <Zap size={20} color="white" fill="rgba(255,255,255,0.2)" />
          </div>
          <div className="flex flex-col">
            <h1 className="font-extrabold m-0" style={{ fontSize: '1rem', lineHeight: '1.2' }}>CareerAgent</h1>
            <div className="flex items-center gap-2">
              <span className="status-dot animate-pulse"></span>
              <span className="uppercase tracking-widest font-bold" style={{ fontSize: '10px', color: 'var(--brand-600)' }}>ATS Active</span>
            </div>
          </div>
        </div>
        {parsedMasterResume && (
          <button onClick={() => setAppState(AppState.PROFILE)} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '12px', padding: '8px', cursor: 'pointer' }}>
            <UserCircle size={20} color="var(--text-muted)" />
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        {/* Setup Phase */}
        {appState === AppState.SETUP && (
          <div className="animate-slide-up flex flex-col gap-8 mt-4">
            <div className="flex flex-col gap-2">
              <h2 className="font-extrabold m-0" style={{ fontSize: '1.75rem', lineHeight: '1.2', color: 'var(--text-main)' }}>
                Elevate your <br/><span style={{ color: 'var(--brand-600)' }}>job hunt.</span>
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Upload your base resume once, tailor it for every role instantly.</p>
            </div>

            <div className="card p-8 text-center" style={{ borderStyle: 'dashed', background: 'white' }}>
              <input type="file" id="resume-up" className="absolute" style={{ opacity: 0, cursor: 'pointer', inset: 0 }} onChange={handleFileUpload} accept=".pdf,.docx,.txt" />
              <div className="flex flex-col items-center gap-4">
                <div style={{ padding: '20px', borderRadius: '24px', backgroundColor: 'var(--brand-50)' }}>
                  <Upload size={32} color="var(--brand-600)" />
                </div>
                <div>
                  <h3 className="font-bold m-0" style={{ fontSize: '1rem' }}>Drop Resume Here</h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>PDF, DOCX, or Text (Max 5MB)</p>
                </div>
              </div>
            </div>

            {isProcessing && (
              <div className="flex items-center justify-center gap-3 p-4 animate-pulse" style={{ background: 'var(--brand-50)', borderRadius: '1rem', border: '1px solid var(--brand-100)' }}>
                <RefreshCcw size={16} className="animate-spin" color="var(--brand-600)" />
                <span className="font-bold uppercase tracking-widest" style={{ fontSize: '0.7rem', color: 'var(--brand-600)' }}>Analyzing Intelligence...</span>
              </div>
            )}
            {error && <div className="p-4" style={{ backgroundColor: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '1rem', color: '#dc2626', fontSize: '0.75rem', fontWeight: 700 }}>{error}</div>}
          </div>
        )}

        {/* Profile Phase */}
        {appState === AppState.PROFILE && parsedMasterResume && (
          <div className="animate-slide-up flex flex-col gap-6">
            <div className="card p-8 text-center flex flex-col items-center gap-6 relative overflow-hidden">
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '80px', background: 'linear-gradient(135deg, var(--brand-50), var(--brand-100))', opacity: 0.5 }}></div>
              <div className="relative" style={{ marginTop: '20px' }}>
                {/* Fixed the justifyCenter typo to justifyContent */}
                <div style={{ width: '96px', height: '96px', background: 'linear-gradient(135deg, var(--brand-600), var(--violet-600))', borderRadius: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 12px 24px rgba(79, 70, 229, 0.3)', transform: 'rotate(6deg)' }}>
                  <UserCircle size={48} color="white" />
                </div>
                <div style={{ position: 'absolute', bottom: '-4px', right: '-4px', background: 'var(--emerald-500)', borderRadius: '12px', padding: '4px', border: '4px solid white' }}>
                  <CheckCircle2 size={16} color="white" />
                </div>
              </div>
              <div>
                <h3 className="font-extrabold m-0" style={{ fontSize: '1.25rem' }}>{parsedMasterResume.fullName}</h3>
                <span className="uppercase font-bold tracking-widest" style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>Verified Profile Active</span>
              </div>

              <button onClick={handleScrapeAndOptimize} disabled={isProcessing} className="btn-primary w-full">
                {isProcessing ? <RefreshCcw className="animate-spin" size={20} /> : <Sparkles size={20} fill="rgba(255,255,255,0.2)" />}
                {isProcessing ? 'Synchronizing...' : 'Match Current Page'}
              </button>

              <button onClick={clearProfile} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer' }}>
                <Trash2 size={12} style={{ marginRight: '6px' }} /> Reset Master Data
              </button>
            </div>

            <div className="flex gap-4">
              <div className="card p-4 flex-1">
                <span className="uppercase font-bold text-muted" style={{ fontSize: '0.6rem' }}>Identified Skills</span>
                <p className="font-extrabold m-0" style={{ fontSize: '1.25rem', color: 'var(--brand-600)' }}>{parsedMasterResume.skills?.length || 0}</p>
              </div>
              <div className="card p-4 flex-1">
                <span className="uppercase font-bold text-muted" style={{ fontSize: '0.6rem' }}>Experience</span>
                <p className="font-extrabold m-0" style={{ fontSize: '1.25rem', color: 'var(--brand-600)' }}>{parsedMasterResume.experience?.length || 0} Roles</p>
              </div>
            </div>
          </div>
        )}

        {/* Optimizing State */}
        {appState === AppState.OPTIMIZING && (
          <div className="py-24 text-center animate-slide-up flex flex-col items-center gap-6">
            <div className="relative">
              <div style={{ width: '80px', height: '80px', border: '4px solid var(--brand-100)', borderTopColor: 'var(--brand-600)', borderRadius: '50%' }} className="animate-spin"></div>
              <Sparkles className="absolute animate-pulse" size={24} color="var(--brand-600)" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
            </div>
            <div>
              <h3 className="font-extrabold" style={{ fontSize: '1.1rem' }}>AI Matching Engine</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Tailoring your profile for maximum ATS visibility...</p>
            </div>
          </div>
        )}

        {/* Completed Results */}
        {appState === AppState.COMPLETED && optimizationResult && editableResume && (
          <div className="animate-slide-up flex flex-col gap-6 pb-24">
            <div className="score-display">
              <div className="flex justify-between items-center relative z-10">
                <div>
                  <p className="uppercase font-bold tracking-widest m-0" style={{ fontSize: '0.65rem', opacity: 0.8 }}>ATS Match Confidence</p>
                  <h2 className="font-extrabold m-0" style={{ fontSize: '3rem', letterSpacing: '-2px' }}>{optimizationResult.optimizedScore}%</h2>
                  <div className="flex items-center gap-2 mt-2">
                    <span style={{ background: 'rgba(255,255,255,0.2)', padding: '4px 10px', borderRadius: '10px', fontSize: '0.65rem', fontWeight: 800 }}>
                      +{optimizationResult.optimizedScore - (optimizationResult.originalScore || 0)}% Boost
                    </span>
                  </div>
                </div>
                <div style={{ width: '80px', height: '80px', background: 'rgba(255,255,255,0.1)', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.2)', fontSize: '2rem', fontWeight: 900 }}>
                  A+
                </div>
              </div>
            </div>

            <div className="flex p-1.5" style={{ background: '#e2e8f0', borderRadius: '1.25rem' }}>
              <button onClick={() => setActiveTab('resume')} className={`tab-button ${activeTab === 'resume' ? 'active' : ''}`}>Resume</button>
              <button onClick={() => setActiveTab('cover')} className={`tab-button ${activeTab === 'cover' ? 'active' : ''}`}>Letter</button>
              <button onClick={() => setActiveTab('diff')} className={`tab-button ${activeTab === 'diff' ? 'active' : ''}`}>Gaps</button>
            </div>

            {activeTab === 'resume' && (
              <div className="card p-6 flex flex-col gap-4 animate-slide-up">
                <div className="flex items-center gap-2 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
                  <CheckCircle2 size={18} color="var(--emerald-500)" />
                  <h4 className="font-extrabold m-0" style={{ fontSize: '0.85rem' }}>Optimized Profile Content</h4>
                </div>
                <div className="flex flex-col gap-4">
                  <div style={{ background: 'var(--bg)', padding: '1.25rem', borderRadius: '1rem' }}>
                    <span className="uppercase font-bold" style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>Targeted Summary</span>
                    <p style={{ fontSize: '0.75rem', lineHeight: '1.6', marginTop: '8px', color: 'var(--text-main)', fontWeight: 500 }}>{editableResume.summary}</p>
                  </div>
                  <div style={{ background: 'var(--brand-50)', padding: '1.25rem', borderRadius: '1rem', border: '1px solid var(--brand-100)' }}>
                    <span className="uppercase font-bold" style={{ fontSize: '0.6rem', color: 'var(--brand-600)' }}>Critical Gaps Filled</span>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {optimizationResult.analysis.keywordGaps.slice(0, 6).map((k, i) => (
                        <span key={i} style={{ background: 'white', color: 'var(--brand-600)', padding: '4px 10px', borderRadius: '8px', fontSize: '0.65rem', fontWeight: 700, border: '1px solid var(--brand-100)' }}>
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'cover' && (
              <div className="card p-8 animate-slide-up">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-2">
                    <FileText size={18} color="var(--brand-600)" />
                    <h4 className="font-extrabold m-0" style={{ fontSize: '0.85rem' }}>Cover Letter</h4>
                  </div>
                  <button onClick={() => navigator.clipboard.writeText(optimizationResult.coverLetter)} style={{ background: 'var(--brand-50)', border: 'none', borderRadius: '12px', padding: '10px', cursor: 'pointer' }}>
                    <Copy size={16} color="var(--brand-600)" />
                  </button>
                </div>
                <div style={{ fontSize: '0.75rem', lineHeight: '1.8', color: 'var(--text-main)', fontStyle: 'italic', background: 'var(--bg)', padding: '1.5rem', borderRadius: '1.5rem', border: '1px dashed var(--border)', whiteSpace: 'pre-wrap' }}>
                  {optimizationResult.coverLetter}
                </div>
              </div>
            )}

            {activeTab === 'diff' && (
               <div className="animate-slide-up flex flex-col" style={{ height: '450px' }}>
                  <DiffView original={masterResumeRaw} optimized={JSON.stringify(editableResume, null, 2)} />
               </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      {appState === AppState.COMPLETED && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '1.5rem', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)', borderTop: '1px solid var(--border)', display: 'flex', gap: '1rem' }}>
          <button onClick={() => setAppState(AppState.PROFILE)} style={{ width: '64px', height: '64px', background: 'white', border: '1px solid var(--border)', borderRadius: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <RefreshCcw size={24} color="var(--text-muted)" />
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
            className="btn-primary" style={{ flex: 1, height: '64px' }}
          >
            <Download size={20} />
            <span className="uppercase tracking-widest font-extrabold" style={{ fontSize: '0.75rem' }}>Download Result</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default ExtensionUI;
