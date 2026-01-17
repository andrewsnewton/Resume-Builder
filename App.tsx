import React, { useState, useEffect } from 'react';
import { AlertCircle, RefreshCw, Info } from 'lucide-react';
import ExtensionUI from './components/ExtensionUI';

// Fix: Declare chrome global variable to avoid TypeScript errors
declare const chrome: any;

// Fallback data for local development (when not running as an extension)
const MOCK_JOB_FALLBACK = `We are looking for a Senior Full Stack Engineer to lead our core product team. 
  
Key Responsibilities:
- Architect and develop scalable web applications using React, Node.js, and PostgreSQL.
- Implement cloud-native solutions on AWS (Lambda, S3, RDS).
- Mentor junior developers and conduct high-quality code reviews.

Requirements:
- 6+ years of experience in full-stack development.
- Deep expertise in TypeScript, React, and serverless architectures.
- Strong understanding of CI/CD pipelines (GitHub Actions, Jenkins).`;

const App: React.FC = () => {
  const [jobDescription, setJobDescription] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPageContent = () => {
    setLoading(true);
    setError(null);

    // Check if we are running in a Chrome Extension environment
    if (typeof chrome !== "undefined" && chrome.tabs && chrome.scripting) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs: any) => {
        const activeTab = tabs[0];
        
        // Handle internal chrome pages where scripting is forbidden
        if (activeTab?.url?.startsWith('chrome://') || activeTab?.url?.startsWith('edge://')) {
          setError("Browsing safety: Manual paste required for internal browser pages.");
          setJobDescription("");
          setLoading(false);
          return;
        }

        if (activeTab?.id) {
          chrome.scripting.executeScript({
            target: { tabId: activeTab.id },
            func: () => {
              // Try specific job board selectors for better extraction
              const selectors = [
                '.jobs-description-content', // LinkedIn
                '.jobs-description',          // LinkedIn alt
                '#jobDescriptionText',        // Indeed
                '.jobDescriptionContent',     // Glassdoor
                '.job-description',           // Generic
                '[data-automation-id="job-description"]' // Workday
              ];
              
              for (const selector of selectors) {
                const element = document.querySelector(selector) as HTMLElement | null;
                if (element && element.innerText.trim().length > 100) {
                  return element.innerText;
                }
              }
              
              // Fallback to body text if no specific selector matched
              const bodyText = document.body.innerText;
              return bodyText.length > 50 ? bodyText : null;
            },
          })
          .then((results: any) => {
            if (results && results[0] && results[0].result) {
              const cleanText = results[0].result.replace(/\s+/g, ' ').trim();
              setJobDescription(cleanText);
            } else {
              setError("Content unreadable. Please paste the job description manually.");
              setJobDescription("");
            }
          })
          .catch((err: any) => {
            console.error("Scripting Error:", err);
            setError("Page security policy blocked auto-scan. Please copy/paste the JD.");
            setJobDescription("");
          })
          .finally(() => setLoading(false));
        } else {
          setError("No active tab found.");
          setLoading(false);
        }
      });
    } else {
      // Fallback for Local Development
      console.warn("Chrome API not found. Using Mock Data.");
      setJobDescription(MOCK_JOB_FALLBACK);
      setLoading(false);
    }
  };

  // Initial Fetch
  useEffect(() => {
    fetchPageContent();
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Analyzing Tab Content...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-slate-50 flex flex-col">
      {/* Extension Header / Status Bar */}
      <div className="bg-white border-b px-4 py-2 flex items-center justify-between shrink-0 z-10 shadow-sm">
         <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${error ? 'bg-amber-400' : 'bg-emerald-500'} shadow-sm animate-pulse`}></div>
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
              {error ? 'Manual Paste Mode' : 'Connected to Job Page'}
            </span>
         </div>
         <button 
           onClick={fetchPageContent}
           className="p-1.5 hover:bg-slate-100 rounded-md transition-colors text-slate-400 hover:text-indigo-600 group"
           title="Re-scan Page"
         >
            <RefreshCw className="w-3.5 h-3.5 group-active:rotate-180 transition-transform duration-500" />
         </button>
      </div>

      {error && (
        <div className="bg-amber-50 p-3 border-b border-amber-100 flex items-start gap-2 animate-in slide-in-from-top duration-300">
           <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
           <p className="text-[10px] text-amber-800 font-semibold leading-snug">{error}</p>
        </div>
      )}

      {/* Main Extension Interface */}
      <div className="flex-1 overflow-hidden">
        <ExtensionUI currentJobDescription={jobDescription} />
      </div>
    </div>
  );
};

export default App;