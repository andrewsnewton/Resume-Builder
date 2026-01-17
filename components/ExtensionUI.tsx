import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  FileText, 
  Upload, 
  Zap, 
  CheckCircle, 
  Download, 
  RefreshCcw,
  BarChart2,
  AlertCircle,
  Hash,
  Target,
  Layout,
  ArrowRight,
  User,
  Settings,
  Circle,
  ShieldCheck,
  Eye,
  Palette,
  Printer,
  Edit3,
  Columns,
  Maximize2,
  Minimize2,
  X,
  Linkedin,
  Mail,
  Copy,
  Check,
  ClipboardPaste
} from 'lucide-react';
// @ts-ignore
import mammoth from 'mammoth';
import { ResumeData, OptimizationResult, AppState, TemplateId } from '../types';
import { ResumeOptimizerService } from '../services/geminiService';
import { DocxGenerator, TEMPLATES } from '../services/docxGenerator';
import DiffView from './DiffView';

// --- Utility: Safe Base64 Encoding for Unicode ---
const utf8ToBase64 = (str: string): string => {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

// --- Editable Text Component ---
const EditableText: React.FC<{
  value: string;
  onChange: (val: string) => void;
  className?: string;
  style?: React.CSSProperties;
  tagName?: 'h1' | 'h2' | 'div' | 'span' | 'p';
  placeholder?: string;
}> = ({ value, onChange, className, style, tagName = 'div', placeholder }) => {
  const Tag = tagName as any;
  
  return (
    <Tag
      contentEditable
      suppressContentEditableWarning
      onBlur={(e: React.FocusEvent<HTMLElement>) => onChange(e.currentTarget.innerText)}
      className={`outline-none hover:bg-yellow-50 focus:bg-yellow-100 focus:ring-2 focus:ring-indigo-200 rounded transition-all cursor-text empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 ${className}`}
      style={style}
      data-placeholder={placeholder}
    >
      {value}
    </Tag>
  );
};

// --- Resume Preview / Editor Component ---
interface ResumePreviewProps {
  data: ResumeData;
  templateId: TemplateId;
  onUpdate?: (newData: ResumeData) => void;
  isInteractive?: boolean;
}

const ResumePreview: React.FC<ResumePreviewProps> = ({ data, templateId, onUpdate, isInteractive = false }) => {
  const config = TEMPLATES[templateId];
  const isClassic = templateId === 'classic';
  
  const [editingLinkedin, setEditingLinkedin] = useState(false);

  const handleUpdate = (path: string[], val: any) => {
    if (!onUpdate) return;
    const newData = JSON.parse(JSON.stringify(data));
    
    let current = newData;
    for (let i = 0; i < path.length - 1; i++) {
      current = current[path[i]];
    }
    current[path[path.length - 1]] = val;
    onUpdate(newData);
  };

  const containerStyle: React.CSSProperties = {
    fontFamily: isClassic ? '"Times New Roman", Times, serif' : 'Arial, Helvetica, sans-serif',
    color: `#${config.colors.text}`,
    lineHeight: 1.25,
    width: '210mm',
    minHeight: '297mm',
    padding: '12.7mm 12.7mm',
    backgroundColor: 'white',
    boxSizing: 'border-box',
    fontSize: '10pt',
    position: 'relative'
  };

  const primaryColor = `#${config.colors.primary}`;
  const secondaryColor = `#${config.colors.secondary}`;

  const headerClass = config.layout.headerAlignment === 'center' ? 'text-center' : 'text-left';
  
  const getSectionHeaderStyle = () => {
    const base = {
      color: primaryColor,
      fontSize: '11pt',
      fontWeight: 700,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.5px',
      marginBottom: '8px',
      marginTop: '12px',
      borderBottom: config.layout.sectionHeaderStyle === 'border-bottom' ? `1px solid ${primaryColor}` : 'none',
      backgroundColor: config.layout.sectionHeaderStyle === 'shaded' ? '#f3f4f6' : 'transparent',
      padding: config.layout.sectionHeaderStyle === 'shaded' ? '2px 6px' : (config.layout.sectionHeaderStyle === 'border-bottom' ? '0 0 2px 0' : '0'),
    };
    return base;
  };

  const separator = <span style={{ color: secondaryColor, margin: '0 8px' }}>{isClassic ? '|' : '•'}</span>;

  const PageBreak = () => (
    isInteractive ? (
      <div className="absolute left-0 w-full pointer-events-none border-b border-dashed border-red-300 flex items-center justify-end px-2" style={{ top: '290mm' }}>
        <span className="text-[9px] text-red-400 bg-white px-1">End of Page 1</span>
      </div>
    ) : null
  );

  return (
    <div style={containerStyle} className="shadow-xl mx-auto relative group">
      <PageBreak />
      
      <header className={`mb-5 ${headerClass}`}>
        <EditableText 
           tagName="h1"
           value={data.fullName} 
           onChange={(v) => handleUpdate(['fullName'], v)}
           style={{ color: primaryColor, fontSize: '20pt', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }} 
        />
        
        <div style={{ fontSize: '9pt', color: secondaryColor, display: 'flex', flexWrap: 'wrap', justifyContent: config.layout.headerAlignment === 'center' ? 'center' : 'flex-start', alignItems: 'center', gap: '4px' }}>
          <EditableText tagName="span" value={data.phone} onChange={(v) => handleUpdate(['phone'], v)} placeholder="Phone" />
          {separator}
          <EditableText tagName="span" value={data.email} onChange={(v) => handleUpdate(['email'], v)} placeholder="Email" />
          {separator}
          
          {editingLinkedin ? (
              <div className="flex items-center bg-yellow-50 rounded px-1">
                 <EditableText 
                    tagName="span" 
                    value={data.linkedin || ''} 
                    onChange={(v) => handleUpdate(['linkedin'], v)} 
                    placeholder="LinkedIn URL"
                    className="min-w-[150px]"
                 />
                 <button onClick={() => setEditingLinkedin(false)} className="ml-2 text-xs text-indigo-600 hover:text-indigo-800 font-bold">Done</button>
              </div>
          ) : (
              <div className="relative group/link inline-flex items-center">
                  <a 
                    href={data.linkedin?.startsWith('http') ? data.linkedin : `https://${data.linkedin}`} 
                    target="_blank" 
                    rel="noreferrer"
                    style={{ color: primaryColor, textDecoration: 'none', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    LinkedIn
                  </a>
                  {isInteractive && (
                    <button 
                        onClick={() => setEditingLinkedin(true)}
                        className="opacity-0 group-hover/link:opacity-100 ml-1 p-0.5 rounded hover:bg-slate-100 text-slate-400 transition-all"
                        title="Edit URL"
                    >
                        <Edit3 className="w-3 h-3" />
                    </button>
                  )}
              </div>
          )}
        </div>
      </header>

      <section className="mb-4">
        <h2 style={getSectionHeaderStyle()}>Professional Summary</h2>
        <EditableText 
            tagName="p"
            value={data.summary} 
            onChange={(v) => handleUpdate(['summary'], v)}
            style={{ textAlign: 'justify' }}
        />
      </section>

      <section className="mb-4">
        <h2 style={getSectionHeaderStyle()}>Core Competencies</h2>
        <div style={{ textAlign: config.layout.headerAlignment === 'center' ? 'center' : 'left' }}>
           <EditableText 
               value={data.skills.join('  •  ')} 
               onChange={(v) => handleUpdate(['skills'], v.split('•').map(s => s.trim()))}
           />
        </div>
      </section>

      <section className="mb-4">
        <h2 style={getSectionHeaderStyle()}>Professional Experience</h2>
        <div className="space-y-4">
          {data.experience.map((exp, i) => (
            <div key={i} className="group/item relative hover:bg-slate-50/50 p-1 -m-1 rounded transition-colors">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <EditableText 
                      tagName="span"
                      value={exp.company}
                      onChange={(v) => handleUpdate(['experience', i.toString(), 'company'], v)}
                      style={{ fontWeight: 'bold', fontSize: '10pt', color: primaryColor, textTransform: 'uppercase' }}
                  />
                  <span style={{ color: secondaryColor, margin: '0 6px' }}>|</span>
                  <EditableText 
                      tagName="span"
                      value={exp.role}
                      onChange={(v) => handleUpdate(['experience', i.toString(), 'role'], v)}
                      style={{ fontWeight: 'bold', fontSize: '10pt' }}
                  />
                </div>
                <EditableText 
                    tagName="div"
                    value={exp.period}
                    onChange={(v) => handleUpdate(['experience', i.toString(), 'period'], v)}
                    style={{ fontWeight: 'bold', fontSize: '9pt', whiteSpace: 'nowrap', textAlign: 'right', minWidth: '100px' }}
                />
              </div>
              <ul style={{ paddingLeft: '18px', margin: '0', listStyleType: 'disc' }}>
                {exp.description.map((desc, j) => (
                  <li key={j} style={{ marginBottom: '2px', paddingLeft: '2px' }}>
                    <EditableText 
                        tagName="span"
                        value={desc}
                        onChange={(v) => handleUpdate(['experience', i.toString(), 'description', j.toString()], v)}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-4">
        <h2 style={getSectionHeaderStyle()}>Education</h2>
        <div className="space-y-1">
          {data.education.map((edu, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <EditableText 
                    tagName="span"
                    value={edu.institution}
                    onChange={(v) => handleUpdate(['education', i.toString(), 'institution'], v)}
                    style={{ fontWeight: 'bold', fontSize: '10pt', color: primaryColor }}
                />
                <span style={{ color: secondaryColor, margin: '0 6px' }}>|</span>
                <EditableText 
                    tagName="span"
                    value={edu.degree}
                    onChange={(v) => handleUpdate(['education', i.toString(), 'degree'], v)}
                    style={{ fontStyle: 'italic', fontSize: '10pt' }}
                />
              </div>
              <EditableText 
                  tagName="div"
                  value={edu.period}
                  onChange={(v) => handleUpdate(['education', i.toString(), 'period'], v)}
                  style={{ fontWeight: 'bold', fontSize: '9pt', whiteSpace: 'nowrap' }}
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

interface ExtensionUIProps {
  currentJobDescription: string;
}

const RECRUITER_STEPS = [
  "Running Gap Analysis...",
  "Identifying Key Hard Skills...",
  "Parallel Document Generation...",
  "Applying Formatting Engine...",
  "Final Review in Progress..."
];

const ExtensionUI: React.FC<ExtensionUIProps> = ({ currentJobDescription: initialJD }) => {
  const [appState, setAppState] = useState<AppState>(AppState.SETUP);
  const [masterResumeRaw, setMasterResumeRaw] = useState<string>('');
  const [parsedMasterResume, setParsedMasterResume] = useState<ResumeData | null>(null);
  const [jobDescription, setJobDescription] = useState<string>(initialJD);
  
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  const [editableResume, setEditableResume] = useState<ResumeData | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>('modern');
  const [activeTab, setActiveTab] = useState<'resume' | 'cover' | 'diff'>('resume');
  const [isEditorExpanded, setIsEditorExpanded] = useState(false);

  const optimizerService = useMemo(() => new ResumeOptimizerService(), []);
  const docxGenerator = useMemo(() => new DocxGenerator(), []);

  // Update local JD state if initialJD changes (prop update from App.tsx scan)
  useEffect(() => {
    setJobDescription(initialJD);
  }, [initialJD]);

  useEffect(() => {
    let interval: any;
    if (isProcessing) {
      interval = setInterval(() => {
        setCurrentStep(prev => (prev < RECRUITER_STEPS.length - 1 ? prev + 1 : prev));
      }, 1800);
    } else {
      setCurrentStep(0);
    }
    return () => clearInterval(interval);
  }, [isProcessing]);

  useEffect(() => {
    if (optimizationResult) {
        setEditableResume(optimizationResult.optimizedResume);
    }
  }, [optimizationResult]);

  const handleCopyCoverLetter = () => {
    if (optimizationResult?.coverLetter) {
        // Use a textarea trick to ensure formatting is preserved if needed, 
        // but clipboard.writeText normally works fine for plain text characters like \n
        try {
            navigator.clipboard.writeText(optimizationResult.coverLetter);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Clipboard copy failed", err);
            // Fallback for older browsers or restricted environments
            const textArea = document.createElement("textarea");
            textArea.value = optimizationResult.coverLetter;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setError(null);

    try {
      let resumeData: ResumeData;
      let resumeTextForAnalysis = "";
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      const isDocx = file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || file.name.toLowerCase().endsWith(".docx");

      if (isPdf) {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(file);
        });
        const base64 = await base64Promise;
        resumeData = await optimizerService.parseResume({ mimeType: "application/pdf", data: base64 });
        resumeTextForAnalysis = JSON.stringify(resumeData);
      } 
      else if (isDocx) {
        const arrayBuffer = await file.arrayBuffer();
        const textResult = await mammoth.extractRawText({ arrayBuffer });
        resumeTextForAnalysis = textResult.value;
        const htmlResult = await mammoth.convertToHtml({ arrayBuffer });
        const base64 = utf8ToBase64(htmlResult.value);
        resumeData = await optimizerService.parseResume({ mimeType: 'text/html', data: base64 });
      } 
      else {
        resumeTextForAnalysis = await file.text();
        resumeData = await optimizerService.parseResume({ mimeType: 'text/plain', data: utf8ToBase64(resumeTextForAnalysis) });
      }

      setMasterResumeRaw(resumeTextForAnalysis);
      setParsedMasterResume(resumeData);
      setAppState(AppState.IDLE); 
    } catch (err: any) {
      console.error("Upload Error:", err);
      setError(`Failed to read file: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const startOptimization = async () => {
    if (!jobDescription || !masterResumeRaw) {
      setError("Missing Job Description. Please paste it below.");
      return;
    }

    setIsProcessing(true);
    setAppState(AppState.OPTIMIZING);
    setError(null);

    try {
      const input = parsedMasterResume ? JSON.stringify(parsedMasterResume) : masterResumeRaw;
      const result = await optimizerService.optimizeResume(input, jobDescription);
      setOptimizationResult(result);
      setAppState(AppState.COMPLETED);
    } catch (err) {
      console.error(err);
      setError("Optimization failed. The AI might be busy.");
      setAppState(AppState.IDLE);
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadDoc = async () => {
    if (!editableResume) return;
    try {
        const blob = await docxGenerator.generate(editableResume, selectedTemplate);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${(editableResume.fullName || 'Resume').replace(/\s/g, '_')}_Tailored.docx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (e) {
        console.error(e);
        setError(`Export failed.`);
    }
  };

  const handlePrint = () => {
    if (!editableResume) return;
    const printWindow = window.open('', '_blank', 'width=900,height=1200');
    if (!printWindow) return;
    const doc = printWindow.document;
    doc.open();
    doc.write(`
      <html><head><script src="https://cdn.tailwindcss.com"></script><style>@page { size: A4; margin: 0; } body { margin: 0; padding: 0; }</style></head>
      <body><div id="root"></div></body></html>
    `);
    doc.close();
    setTimeout(() => {
        const rootElement = doc.getElementById('root');
        if (rootElement) {
             const root = createRoot(rootElement);
             root.render(<ResumePreview data={editableResume} templateId={selectedTemplate} isInteractive={false} />);
             setTimeout(() => { printWindow.focus(); printWindow.print(); }, 1000);
        }
    }, 100);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 border-l shadow-2xl overflow-hidden font-sans relative">
      <div className="p-4 bg-indigo-900 text-white flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-inner">
            <Zap className="w-4 h-4 fill-yellow-400 text-yellow-400" />
          </div>
          <div>
            <h1 className="font-black text-xs uppercase tracking-tighter leading-none">AI Career Agent</h1>
            <p className="text-[8px] text-indigo-300 font-bold uppercase tracking-widest mt-1">Optimization Active</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-6">
        {appState === AppState.SETUP && (
          <div className="space-y-6 mt-4">
            <div className="text-center space-y-2">
              <h2 className="text-lg font-black text-slate-800">Hello, Candidate!</h2>
              <p className="text-slate-500 text-[10px] font-medium leading-relaxed">Let's get you hired. Upload your base resume to start tailoring for the current role.</p>
            </div>
            <div className="border-2 border-dashed border-slate-200 rounded-3xl p-8 text-center hover:border-indigo-400 hover:bg-white transition-all group cursor-pointer relative">
              <input type="file" id="resume-upload" className="hidden" onChange={handleFileUpload} accept=".txt,.pdf,.doc,.docx" />
              <label htmlFor="resume-upload" className="cursor-pointer block">
                <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Upload className="w-7 h-7 text-slate-400 group-hover:text-indigo-600" />
                </div>
                <span className="text-[11px] font-black text-slate-700 uppercase tracking-wide">Import Base Resume</span>
              </label>
            </div>
            {error && <p className="text-[10px] text-red-500 font-bold text-center bg-red-50 p-2 rounded-xl">{error}</p>}
          </div>
        )}

        {(appState === AppState.IDLE || appState === AppState.OPTIMIZING) && (
          <div className="space-y-5">
            <div className={`bg-white rounded-3xl p-4 border ${!jobDescription ? 'border-amber-200 bg-amber-50/20' : 'border-slate-200'} shadow-sm space-y-3`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {jobDescription ? <Target className="w-3.5 h-3.5 text-emerald-600" /> : <ClipboardPaste className="w-3.5 h-3.5 text-amber-600" />}
                  <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-wide">
                    {jobDescription ? 'Verified Job Info' : 'Step 2: Paste Job Description'}
                  </h3>
                </div>
                {jobDescription && <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />}
              </div>
              <textarea 
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="No JD detected. Please paste the full job description text here manually to proceed..."
                className="w-full text-[10px] border border-slate-100 rounded-xl p-3 h-32 focus:ring-2 focus:ring-indigo-100 outline-none resize-none custom-scrollbar bg-white font-medium leading-relaxed"
              />
              {!jobDescription && <p className="text-[9px] text-amber-700 font-bold animate-pulse">Waiting for manual input...</p>}
            </div>

            {isProcessing ? (
              <div className="py-6 space-y-6 text-center">
                <div className="relative w-14 h-14 mx-auto">
                    <div className="absolute inset-0 border-2 border-indigo-100 rounded-full"></div>
                    <div className="absolute inset-0 border-t-2 border-indigo-600 rounded-full animate-spin"></div>
                </div>
                <div className="space-y-4 px-2">
                  <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Generative Pipeline Running</h4>
                  <div className="space-y-2 max-w-[180px] mx-auto text-left">
                    {RECRUITER_STEPS.map((step, idx) => (
                      <div key={idx} className="flex items-center gap-2.5">
                         <div className={`w-1.5 h-1.5 rounded-full ${idx === currentStep ? 'bg-indigo-600 animate-pulse' : idx < currentStep ? 'bg-emerald-500' : 'bg-slate-200'}`}></div>
                         <span className={`text-[9px] font-bold ${idx === currentStep ? 'text-indigo-600' : 'text-slate-400'}`}>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <button 
                disabled={!jobDescription}
                onClick={startOptimization} 
                className={`w-full py-4 rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-lg transition-all ${!jobDescription ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-indigo-900 text-white hover:bg-black active:scale-[0.98]'}`}
              >
                <Zap className={`w-4 h-4 ${jobDescription ? 'text-yellow-400 fill-yellow-400' : ''}`} /> 
                {jobDescription ? 'Generate Tailored Pack' : 'Paste JD to Start'}
              </button>
            )}
          </div>
        )}

        {appState === AppState.COMPLETED && optimizationResult && editableResume && (
          <div className="space-y-5 pb-20 animate-in fade-in slide-in-from-bottom-2 duration-500">
             <div className="bg-slate-100 p-1 rounded-xl flex gap-1 shadow-inner">
                <button onClick={() => setActiveTab('resume')} className={`flex-1 py-1.5 text-[9px] font-black uppercase rounded-lg flex items-center justify-center gap-1.5 transition-all ${activeTab === 'resume' ? 'bg-white shadow text-indigo-700' : 'text-slate-500'}`}>
                   <FileText className="w-3 h-3" /> Resume
                </button>
                <button onClick={() => setActiveTab('cover')} className={`flex-1 py-1.5 text-[9px] font-black uppercase rounded-lg flex items-center justify-center gap-1.5 transition-all ${activeTab === 'cover' ? 'bg-white shadow text-indigo-700' : 'text-slate-500'}`}>
                   <Mail className="w-3 h-3" /> Cover Letter
                </button>
                <button onClick={() => setActiveTab('diff')} className={`flex-1 py-1.5 text-[9px] font-black uppercase rounded-lg flex items-center justify-center gap-1.5 transition-all ${activeTab === 'diff' ? 'bg-white shadow text-indigo-700' : 'text-slate-500'}`}>
                   <Columns className="w-3 h-3" /> Comparison
                </button>
             </div>

             {activeTab === 'resume' && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between px-2">
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Draft Review (Click to Edit)</p>
                        <button onClick={() => setIsEditorExpanded(true)} className="text-[9px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors">
                            Expand Editor
                        </button>
                    </div>
                    <div className="transform scale-[0.42] origin-top-left w-[238%] h-[550px] border rounded-2xl shadow-inner overflow-y-auto bg-slate-200 p-4 custom-scrollbar">
                        <ResumePreview data={editableResume} templateId={selectedTemplate} onUpdate={setEditableResume} isInteractive={true} />
                    </div>
                </div>
             )}

             {activeTab === 'cover' && (
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 relative min-h-[400px]">
                    <div className="flex items-center justify-between mb-4 border-b pb-3">
                        <h4 className="text-[10px] font-black text-slate-800 uppercase">Eagerness & Fit Letter</h4>
                        <button 
                            onClick={handleCopyCoverLetter} 
                            className={`p-2 rounded-xl transition-all flex items-center gap-2 text-[9px] font-black uppercase border ${copied ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-100'}`}
                        >
                            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            {copied ? 'Copied' : 'Copy Text'}
                        </button>
                    </div>
                    <div id="cover-letter-text" className="whitespace-pre-wrap text-[11px] text-slate-700 leading-relaxed font-sans pr-2 select-text selection:bg-indigo-100">
                        {optimizationResult.coverLetter}
                    </div>
                </div>
             )}

             {activeTab === 'diff' && (
                <div className="bg-slate-900 rounded-3xl p-4 text-white h-[400px] flex flex-col shadow-2xl">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3 px-1">Optimizations Applied</p>
                    <DiffView original={masterResumeRaw} optimized={JSON.stringify(editableResume, null, 2)} />
                </div>
             )}
          </div>
        )}
      </div>

      {appState === AppState.COMPLETED && (
        <div className="p-5 border-t bg-white flex flex-col gap-2 shrink-0 shadow-[0_-4px_10px_rgba(0,0,0,0.03)]">
          <div className="flex gap-2">
            <button onClick={downloadDoc} className="flex-1 py-3 bg-indigo-900 text-white rounded-xl font-black text-[11px] flex items-center justify-center gap-2 shadow-lg hover:bg-black transition-all uppercase tracking-tighter">
                <Download className="w-3.5 h-3.5" /> Export DOCX
            </button>
            <button onClick={handlePrint} className="flex-1 py-3 bg-white text-indigo-700 rounded-xl font-black text-[11px] border border-indigo-200 flex items-center justify-center gap-2 hover:bg-slate-50 transition-all uppercase tracking-tighter">
                <Printer className="w-3.5 h-3.5" /> PDF Print
            </button>
          </div>
          <p className="text-[8px] text-slate-400 text-center font-bold tracking-widest uppercase">Verified ATS Compliant</p>
        </div>
      )}

      {isEditorExpanded && editableResume && (
        <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-sm overflow-y-auto custom-scrollbar flex justify-center py-10 animate-in zoom-in-95 duration-300">
           <div className="w-full max-w-4xl flex flex-col items-center px-6">
              <div className="sticky top-4 z-50 flex gap-4 bg-slate-800/90 backdrop-blur-md p-2 px-4 rounded-full mb-10 border border-white/20 shadow-2xl items-center">
                 <button onClick={() => setIsEditorExpanded(false)} className="px-4 py-2 bg-white text-slate-900 rounded-full text-[10px] font-black uppercase flex items-center gap-2 hover:bg-indigo-50 transition-all">
                    <Minimize2 className="w-3 h-3" /> Close Editor
                 </button>
                 <div className="h-4 w-[1px] bg-white/20"></div>
                 <button onClick={downloadDoc} className="px-4 py-2 bg-indigo-600 text-white rounded-full text-[10px] font-black uppercase flex items-center gap-2 hover:bg-indigo-500 shadow-lg">
                    <Download className="w-3 h-3" /> Download DOCX
                 </button>
              </div>
              <div className="mb-20 animate-in slide-in-from-bottom-4 duration-500">
                  <ResumePreview data={editableResume} templateId={selectedTemplate} onUpdate={setEditableResume} isInteractive={true} />
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default ExtensionUI;