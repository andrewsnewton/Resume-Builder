
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
  Linkedin
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
  
  // State to toggle between "LinkedIn" text link and editing the URL
  const [editingLinkedin, setEditingLinkedin] = useState(false);

  // Handlers for updating deep state
  const handleUpdate = (path: string[], val: any) => {
    if (!onUpdate) return;
    const newData = JSON.parse(JSON.stringify(data)); // Deep copy
    
    let current = newData;
    for (let i = 0; i < path.length - 1; i++) {
      current = current[path[i]];
    }
    current[path[path.length - 1]] = val;
    onUpdate(newData);
  };

  // Base Container Styles (A4 Page)
  const containerStyle: React.CSSProperties = {
    // CRITICAL: Use Arial to match DOCX 'Arial' metric.
    fontFamily: isClassic ? '"Times New Roman", Times, serif' : 'Arial, Helvetica, sans-serif',
    color: `#${config.colors.text}`,
    lineHeight: 1.25, // Matches Word's "Single" spacing
    width: '210mm',
    minHeight: '297mm', // A4 Height
    padding: '12.7mm 12.7mm', // Exact 0.5 inch margins
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

  // Visual Page Break Marker
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
      
      {/* Header */}
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
          
          {/* LinkedIn Display Logic */}
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
                    onClick={(e) => {
                         // If interactive, verify user intent or just let it open.
                         // For now, we allow opening the link.
                    }}
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

      {/* Summary */}
      <section className="mb-4">
        <h2 style={getSectionHeaderStyle()}>Professional Summary</h2>
        <EditableText 
            tagName="p"
            value={data.summary} 
            onChange={(v) => handleUpdate(['summary'], v)}
            style={{ textAlign: 'justify' }}
        />
      </section>

      {/* Skills */}
      <section className="mb-4">
        <h2 style={getSectionHeaderStyle()}>Core Competencies</h2>
        <div style={{ textAlign: config.layout.headerAlignment === 'center' ? 'center' : 'left' }}>
           <EditableText 
               value={data.skills.join('  •  ')} 
               onChange={(v) => handleUpdate(['skills'], v.split('•').map(s => s.trim()))}
           />
        </div>
      </section>

      {/* Experience */}
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

      {/* Education */}
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
  "Semantic Rewriting of Experience...",
  "Applying Selected Template...",
  "Finalizing Document..."
];

const ExtensionUI: React.FC<ExtensionUIProps> = ({ currentJobDescription }) => {
  const [appState, setAppState] = useState<AppState>(AppState.SETUP);
  const [masterResumeRaw, setMasterResumeRaw] = useState<string>('');
  const [parsedMasterResume, setParsedMasterResume] = useState<ResumeData | null>(null);
  
  // Optimization Result
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  
  // Editable State (The Source of Truth for the Editor)
  const [editableResume, setEditableResume] = useState<ResumeData | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  // Navigation & UI State
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>('modern');
  const [activeTab, setActiveTab] = useState<'editor' | 'diff'>('editor');
  const [isEditorExpanded, setIsEditorExpanded] = useState(false);

  const optimizerService = useMemo(() => new ResumeOptimizerService(), []);
  const docxGenerator = useMemo(() => new DocxGenerator(), []);

  useEffect(() => {
    let interval: any;
    if (isProcessing) {
      interval = setInterval(() => {
        setCurrentStep(prev => (prev < RECRUITER_STEPS.length - 1 ? prev + 1 : prev));
      }, 1500);
    } else {
      setCurrentStep(0);
    }
    return () => clearInterval(interval);
  }, [isProcessing]);

  // When optimization completes, initialize the editable state
  useEffect(() => {
    if (optimizationResult) {
        setEditableResume(optimizationResult.optimizedResume);
    }
  }, [optimizationResult]);

  // --- File Handling Functions (same as before) ---
  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const reconstructResumeText = (data: ResumeData): string => {
    return `
${data.fullName}
${data.location || ''} | ${data.email || ''} | ${data.phone || ''}

SUMMARY
${data.summary}

EXPERIENCE
${data.experience.map(exp => `${exp.role} at ${exp.company} (${exp.period})\n${exp.description.join('\n')}`).join('\n\n')}

SKILLS
${data.skills.join(', ')}

EDUCATION
${data.education.map(edu => `${edu.degree}, ${edu.institution} (${edu.period})`).join('\n')}
    `.trim();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setError(null);

    try {
      let resumeData: ResumeData;
      let resumeTextForAnalysis = "";
      // For parsing, we might want HTML to capture links
      let resumeContentForParsing = ""; 

      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      const isDocx = file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || file.name.toLowerCase().endsWith(".docx");

      if (isPdf) {
        const base64 = await readFileAsBase64(file);
        resumeContentForParsing = base64; // Sent as mimeType: application/pdf
        
        resumeData = await optimizerService.parseResume({ 
            mimeType: "application/pdf", 
            data: base64 
        });
        resumeTextForAnalysis = reconstructResumeText(resumeData);
      } 
      else if (isDocx) {
        const arrayBuffer = await readFileAsArrayBuffer(file);
        
        // Ensure mammoth is available
        if (!mammoth) {
            throw new Error("Docx parser (mammoth) not loaded");
        }

        // 1. Extract Raw Text for Diff / Display
        const textResult = await mammoth.extractRawText({ arrayBuffer });
        resumeTextForAnalysis = textResult.value;

        // 2. Extract HTML for Parsing (to capture Links behind text)
        const htmlResult = await mammoth.convertToHtml({ arrayBuffer });
        
        // Use custom UTF-8 compatible encoding
        resumeContentForParsing = utf8ToBase64(htmlResult.value); 

        resumeData = await optimizerService.parseResume({ 
            mimeType: 'text/html', // Tell service to treat this as HTML
            data: resumeContentForParsing
        });
      } 
      else {
        // Fallback for TXT or others
        resumeTextForAnalysis = await readFileAsText(file);
        
        // Use custom UTF-8 compatible encoding
        resumeContentForParsing = utf8ToBase64(resumeTextForAnalysis);
        
        resumeData = await optimizerService.parseResume({ 
            mimeType: 'text/plain', 
            data: resumeContentForParsing
        });
      }

      setMasterResumeRaw(resumeTextForAnalysis);
      setParsedMasterResume(resumeData);
      setAppState(AppState.IDLE); 

    } catch (err: any) {
      console.error("Upload Error:", err);
      setError(`Failed to parse document: ${err.message || 'Unknown error'}`);
      setAppState(AppState.SETUP);
    } finally {
      setIsProcessing(false);
    }
  };

  const updateParsedData = (field: keyof ResumeData, value: string) => {
    if (parsedMasterResume) {
      setParsedMasterResume({
        ...parsedMasterResume,
        [field]: value
      });
    }
  };

  const startOptimization = async () => {
    if (!currentJobDescription || !masterResumeRaw) {
      setError("Missing JD or Resume.");
      return;
    }

    setIsProcessing(true);
    setAppState(AppState.OPTIMIZING);
    setError(null);

    try {
      const input = parsedMasterResume ? JSON.stringify(parsedMasterResume) : masterResumeRaw;
      const result = await optimizerService.optimizeResume(input, currentJobDescription);
      setOptimizationResult(result);
      setAppState(AppState.COMPLETED);
    } catch (err) {
      console.error(err);
      setError("Optimization timed out. Try again.");
      setAppState(AppState.IDLE);
    } finally {
      setIsProcessing(false);
    }
  };

  // Uses the current 'editableResume' for download
  const downloadDoc = async () => {
    if (!editableResume) return;
    try {
        const blob = await docxGenerator.generate(editableResume, selectedTemplate);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${(editableResume.fullName || 'Resume').replace(/\s/g, '_')}_Optimized_${TEMPLATES[selectedTemplate].name}.docx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (e) {
        console.error(e);
        setError(`Failed to generate DOCX document.`);
    }
  };

  // Uses the current 'editableResume' for printing
  const handlePrint = () => {
    if (!editableResume) return;
    const printWindow = window.open('', '_blank', 'width=900,height=1200');
    
    if (!printWindow) {
        alert("Please allow popups to print/save the resume as PDF.");
        return;
    }

    const doc = printWindow.document;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>${editableResume.fullName} - Resume</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
          <style>
             @page { size: A4; margin: 0; }
             body { margin: 0; padding: 0; background-color: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
             #root { width: 210mm; min-height: 297mm; margin: 20px auto; background: white; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
             @media print { 
               body { background: none; } 
               #root { width: 100%; margin: 0; box-shadow: none; } 
               ul { list-style-type: disc !important; }
             }
          </style>
        </head>
        <body><div id="root">Loading preview...</div></body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
        const rootElement = doc.getElementById('root');
        if (rootElement) {
             const root = createRoot(rootElement);
             // Render non-interactive version for print
             root.render(<ResumePreview data={editableResume} templateId={selectedTemplate} isInteractive={false} />);
             setTimeout(() => {
                 printWindow.focus();
                 printWindow.print();
             }, 1000);
        }
    }, 100);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 border-l shadow-2xl overflow-hidden font-sans relative">
      {/* Header */}
      <div className="p-4 bg-indigo-900 text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-inner">
            <Zap className="w-5 h-5 fill-yellow-400 text-yellow-400" />
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-tight leading-none">ATS Engine</h1>
            <p className="text-[9px] text-indigo-300 font-bold uppercase tracking-widest mt-1">Template Agent Active</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        {appState === AppState.SETUP && (
          <div className="space-y-8 mt-6">
            <div className="text-center">
              <h2 className="text-xl font-black text-slate-800">Profile Setup</h2>
              <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                Upload your resume. We will extract your data and generate a standardized ATS template instantly.
              </p>
            </div>

            <div className="border-2 border-dashed border-slate-200 rounded-3xl p-10 text-center hover:border-indigo-500 hover:bg-white transition-all group relative">
              <input 
                type="file" 
                id="resume-upload" 
                className="hidden" 
                onChange={handleFileUpload}
                accept=".txt,.pdf,.doc,.docx"
              />
              <label htmlFor="resume-upload" className="cursor-pointer block">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-indigo-50 transition-colors">
                  <Upload className="w-8 h-8 text-slate-400 group-hover:text-indigo-600" />
                </div>
                <span className="text-sm font-black text-slate-700 block mb-1">Upload Resume</span>
              </label>
            </div>
            
            {isProcessing && (
               <div className="text-center">
                  <RefreshCcw className="w-6 h-6 text-indigo-600 animate-spin mx-auto mb-2" />
                  <p className="text-xs text-slate-500 font-medium">Extracting Data & Generating Template...</p>
               </div>
            )}
          </div>
        )}

        {(appState === AppState.IDLE || appState === AppState.OPTIMIZING) && (
          <div className="space-y-6">
            {/* Candidate Details Form */}
            <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between mb-1">
                   <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-indigo-600" />
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-wide">Candidate Details</h3>
                   </div>
                   <span className="text-[10px] text-slate-400">Verify extracted info</span>
                </div>
                
                <div className="space-y-2">
                     <input 
                        type="text" 
                        placeholder="Full Name"
                        value={parsedMasterResume?.fullName || ''}
                        onChange={(e) => updateParsedData('fullName', e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-indigo-100 outline-none"
                     />
                     <div className="grid grid-cols-2 gap-2">
                         <input 
                            type="text" 
                            placeholder="Email"
                            value={parsedMasterResume?.email || ''}
                            onChange={(e) => updateParsedData('email', e.target.value)}
                            className="w-full text-xs border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-indigo-100 outline-none"
                         />
                         <input 
                            type="text" 
                            placeholder="Phone"
                            value={parsedMasterResume?.phone || ''}
                            onChange={(e) => updateParsedData('phone', e.target.value)}
                            className="w-full text-xs border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-indigo-100 outline-none"
                         />
                     </div>
                     <div className="relative">
                        <input 
                            type="text" 
                            placeholder="LinkedIn URL (e.g. linkedin.com/in/username)"
                            value={parsedMasterResume?.linkedin || ''}
                            onChange={(e) => updateParsedData('linkedin', e.target.value)}
                            className={`w-full text-xs border rounded-lg p-2 focus:ring-2 outline-none pr-8 ${!parsedMasterResume?.linkedin ? 'border-amber-300 bg-amber-50 focus:ring-amber-100' : 'border-slate-200 focus:ring-indigo-100'}`}
                        />
                        {!parsedMasterResume?.linkedin && (
                            <AlertCircle className="w-4 h-4 text-amber-500 absolute right-2 top-2" />
                        )}
                        {parsedMasterResume?.linkedin && (
                            <Linkedin className="w-4 h-4 text-indigo-500 absolute right-2 top-2" />
                        )}
                     </div>
                </div>
            </div>

            {/* Template Selection */}
            <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                   <Palette className="w-4 h-4 text-indigo-600" />
                   <h3 className="text-xs font-black text-slate-800 uppercase tracking-wide">Select Layout Style</h3>
                </div>
                <div className="grid grid-cols-3 gap-2">
                    {(Object.keys(TEMPLATES) as TemplateId[]).map((tId) => (
                        <button
                          key={tId}
                          onClick={() => setSelectedTemplate(tId)}
                          className={`p-2 rounded-xl text-center border-2 transition-all ${
                              selectedTemplate === tId 
                              ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                              : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200'
                          }`}
                        >
                            <div className={`w-full h-8 mb-2 rounded border ${tId === 'classic' ? 'font-serif' : 'font-sans'} text-[6px] p-1 overflow-hidden opacity-50 bg-white`}>
                                <div className={`w-full h-1 bg-current mb-1 ${tId === 'classic' ? 'mx-auto w-1/2' : ''}`}></div>
                                <div className="space-y-0.5">
                                    <div className="w-full h-0.5 bg-slate-200"></div>
                                    <div className="w-3/4 h-0.5 bg-slate-200"></div>
                                </div>
                            </div>
                            <span className="text-[9px] font-bold block">{TEMPLATES[tId].name}</span>
                        </button>
                    ))}
                </div>
            </div>

            {isProcessing ? (
              <div className="py-8 space-y-6">
                <div className="flex flex-col items-center justify-center text-center">
                   <div className="w-16 h-16 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin mb-4"></div>
                   <h4 className="text-sm font-black text-slate-900">Optimizing Content...</h4>
                </div>
                <div className="space-y-3 px-4">
                  {RECRUITER_STEPS.map((step, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                       <div className={`w-2 h-2 rounded-full ${idx === currentStep ? 'bg-indigo-600 animate-pulse' : idx < currentStep ? 'bg-emerald-500' : 'bg-slate-200'}`}></div>
                       <span className={`text-[10px] font-medium ${idx === currentStep ? 'text-indigo-600' : 'text-slate-400'}`}>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                 <div className="bg-indigo-50/50 rounded-3xl p-4 border border-indigo-100/50">
                    <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Target Job</p>
                    <p className="text-xs text-slate-600 line-clamp-2 font-medium">"{currentJobDescription.slice(0, 100)}..."</p>
                 </div>

                 <button
                  onClick={startOptimization}
                  className="w-full py-4 bg-indigo-900 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg hover:bg-black transition-all active:scale-[0.98]"
                >
                  <Zap className="w-4 h-4 text-yellow-400" />
                  Apply {TEMPLATES[selectedTemplate].name} & Rewrite
                </button>
              </div>
            )}
            
            {error && <p className="text-xs text-red-500 text-center font-bold">{error}</p>}
          </div>
        )}

        {appState === AppState.COMPLETED && optimizationResult && editableResume && (
          <div className="space-y-6 pb-20">
             
             {/* Header Summary */}
             <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-4 text-center">
                <div className="flex items-center justify-center gap-2 text-emerald-900 mb-1">
                    <CheckCircle className="w-4 h-4" />
                    <h2 className="text-sm font-black">Optimization Complete</h2>
                </div>
                <p className="text-[10px] text-emerald-700">
                  Score increased by <strong>{optimizationResult.optimizedScore - optimizationResult.originalScore}%</strong>.
                </p>
             </div>

             {/* Mode Toggles */}
             <div className="bg-slate-100 p-1 rounded-xl flex gap-1">
                <button 
                  onClick={() => setActiveTab('editor')}
                  className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${activeTab === 'editor' ? 'bg-white shadow text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                   <Edit3 className="w-3 h-3" /> Preview & Edit
                </button>
                <button 
                  onClick={() => setActiveTab('diff')}
                  className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${activeTab === 'diff' ? 'bg-white shadow text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                   <Columns className="w-3 h-3" /> Diff View
                </button>
             </div>

             {activeTab === 'diff' ? (
                <div className="bg-slate-900 rounded-3xl p-5 text-white flex flex-col h-96">
                    <div className="flex justify-between items-center mb-4 shrink-0">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Content Changes</span>
                    </div>
                    <DiffView 
                    original={masterResumeRaw} 
                    optimized={reconstructResumeText(editableResume)} 
                    />
                </div>
             ) : (
                <div className="space-y-2 relative">
                    <div className="text-center flex items-center justify-between px-2 mb-2">
                        <p className="text-[10px] text-slate-400 italic">💡 Click text to edit.</p>
                        <button 
                            onClick={() => setIsEditorExpanded(true)}
                            className="text-[10px] font-bold text-indigo-600 flex items-center gap-1 hover:text-indigo-800 bg-indigo-50 px-2 py-1 rounded-md"
                        >
                            <Maximize2 className="w-3 h-3" /> Expand
                        </button>
                    </div>
                    
                    {/* Live Editor (Tiny View) */}
                    <div className="transform scale-[0.45] origin-top-left w-[220%] h-[600px] border rounded shadow-inner overflow-y-auto bg-slate-200 p-4 custom-scrollbar">
                        <ResumePreview 
                            data={editableResume} 
                            templateId={selectedTemplate} 
                            onUpdate={setEditableResume} 
                            isInteractive={true}
                        />
                    </div>
                </div>
             )}
          </div>
        )}
      </div>

      {appState === AppState.COMPLETED && optimizationResult && (
        <div className="p-6 border-t bg-white flex flex-col gap-3">
          <div className="flex gap-2 w-full">
            <button 
                onClick={downloadDoc}
                className="flex-1 py-4 bg-indigo-900 text-white rounded-2xl font-black text-sm hover:bg-black transition-all shadow-xl flex items-center justify-center gap-2"
            >
                <Download className="w-4 h-4" />
                DOCX
            </button>
            <button 
                onClick={handlePrint}
                className="flex-1 py-4 bg-indigo-50 text-indigo-700 rounded-2xl font-black text-sm hover:bg-indigo-100 transition-all border border-indigo-200 flex items-center justify-center gap-2"
            >
                <Printer className="w-4 h-4" />
                Print / PDF
            </button>
          </div>
          <button 
             onClick={() => setAppState(AppState.IDLE)}
             className="w-full py-2 text-slate-400 font-bold text-[10px] uppercase hover:text-indigo-600"
          >
             Start Over
          </button>
        </div>
      )}

      {/* FULL SCREEN EXPANDED EDITOR MODAL */}
      {isEditorExpanded && editableResume && (
        <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-sm overflow-y-auto custom-scrollbar flex justify-center py-10 animate-in fade-in duration-200">
           <div className="w-full max-w-6xl flex flex-col items-center px-4">
              
              {/* Floating Toolbar */}
              <div className="sticky top-4 z-50 flex gap-4 bg-slate-800/80 backdrop-blur-md p-2 rounded-full mb-8 border border-white/10 shadow-2xl">
                 <button 
                    onClick={() => setIsEditorExpanded(false)} 
                    className="px-4 py-2 bg-white text-slate-900 rounded-full text-xs font-bold flex items-center gap-2 hover:bg-indigo-50 transition-colors"
                 > 
                    <Minimize2 className="w-3 h-3" /> Minimize 
                 </button>
                 <div className="w-px h-8 bg-white/20 my-auto"></div>
                 <button 
                    onClick={downloadDoc} 
                    className="px-4 py-2 bg-indigo-600 text-white rounded-full text-xs font-bold flex items-center gap-2 hover:bg-indigo-500 transition-colors shadow-lg"
                 > 
                    <Download className="w-3 h-3" /> Save DOCX 
                 </button>
              </div>
              
              {/* Full Size Editor */}
              <div className="mb-20 animate-in zoom-in-95 duration-300">
                  <ResumePreview 
                        data={editableResume} 
                        templateId={selectedTemplate} 
                        onUpdate={setEditableResume} 
                        isInteractive={true}
                    />
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default ExtensionUI;
