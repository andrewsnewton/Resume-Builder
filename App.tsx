
import React, { useState } from 'react';
// Added Zap to the imports to resolve the "Cannot find name 'Zap'" error
import { Briefcase, MapPin, DollarSign, Calendar, Star, Building2, ExternalLink, Zap } from 'lucide-react';
import ExtensionUI from './components/ExtensionUI';

const MOCK_JOB = {
  title: "Senior Full Stack Engineer",
  company: "InnovateTech Global",
  location: "Remote / New York, NY",
  salary: "$160k - $210k • Equity",
  posted: "2 days ago",
  description: `We are looking for a Senior Full Stack Engineer to lead our core product team. 
  
  Key Responsibilities:
  - Architect and develop scalable web applications using React, Node.js, and PostgreSQL.
  - Implement cloud-native solutions on AWS (Lambda, S3, RDS).
  - Mentor junior developers and conduct high-quality code reviews.
  - Optimize frontend performance, reducing TTI by 30%.
  
  Requirements:
  - 6+ years of experience in full-stack development.
  - Deep expertise in TypeScript, React, and serverless architectures.
  - Proven track record of improving engineering efficiency.
  - Strong understanding of CI/CD pipelines (GitHub Actions, Jenkins).
  - Excellent communication and collaboration skills.`
};

const App: React.FC = () => {
  const [showExtension, setShowExtension] = useState(false);

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Main Simulated Browser Content (Job Board) */}
      <div className={`flex-1 transition-all duration-300 ${showExtension ? 'mr-[400px]' : ''}`}>
        {/* Fake Navbar */}
        <header className="bg-white border-b px-8 py-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-8">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-xl">L</span>
            </div>
            <nav className="hidden md:flex gap-6 text-sm font-medium text-gray-500">
              <a href="#" className="text-indigo-600 border-b-2 border-indigo-600 pb-4 mt-4">Jobs</a>
              <a href="#" className="hover:text-gray-900 pb-4 mt-4">Companies</a>
              <a href="#" className="hover:text-gray-900 pb-4 mt-4">Salaries</a>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <button className="text-sm font-medium text-gray-600">Sign In</button>
            <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow-sm">Post a Job</button>
          </div>
        </header>

        {/* Job Content Area */}
        <main className="max-w-4xl mx-auto py-12 px-6">
          <div className="bg-white rounded-2xl shadow-sm border p-8">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
              <div className="flex gap-6">
                <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center border shrink-0">
                  <Building2 className="w-10 h-10 text-gray-400" />
                </div>
                <div>
                  <h1 className="text-3xl font-black text-gray-900 mb-2">{MOCK_JOB.title}</h1>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 font-medium">
                    <span className="flex items-center gap-1.5"><Building2 className="w-4 h-4" /> {MOCK_JOB.company}</span>
                    <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {MOCK_JOB.location}</span>
                    <span className="flex items-center gap-1.5 font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded"><DollarSign className="w-4 h-4" /> {MOCK_JOB.salary}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <button 
                  onClick={() => setShowExtension(true)}
                  className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center gap-2 group"
                >
                  Apply Now
                  <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </button>
                <p className="text-[10px] text-center text-gray-400 uppercase tracking-widest font-bold">{MOCK_JOB.posted}</p>
              </div>
            </div>

            <div className="flex gap-8 border-b mb-8 text-sm font-bold text-gray-400">
              <button className="border-b-2 border-indigo-600 text-indigo-600 pb-4">Job Description</button>
              <button className="pb-4 hover:text-gray-600">Company Culture</button>
              <button className="pb-4 hover:text-gray-600">Benefits</button>
            </div>

            <div className="prose prose-indigo max-w-none text-gray-600 leading-relaxed space-y-4">
              <p>{MOCK_JOB.description.split('\n\n')[0]}</p>
              
              <h3 className="text-lg font-bold text-gray-900 mt-8">Key Responsibilities</h3>
              <ul className="list-disc pl-5 space-y-2">
                <li>Architect and develop scalable web applications using React, Node.js, and PostgreSQL.</li>
                <li>Implement cloud-native solutions on AWS (Lambda, S3, RDS).</li>
                <li>Mentor junior developers and conduct high-quality code reviews.</li>
                <li>Optimize frontend performance, reducing TTI by 30%.</li>
              </ul>

              <h3 className="text-lg font-bold text-gray-900 mt-8">Requirements</h3>
              <ul className="list-disc pl-5 space-y-2">
                <li>6+ years of experience in full-stack development.</li>
                <li>Deep expertise in TypeScript, React, and serverless architectures.</li>
                <li>Proven track record of improving engineering efficiency.</li>
                <li>Strong understanding of CI/CD pipelines (GitHub Actions, Jenkins).</li>
                <li>Excellent communication and collaboration skills.</li>
              </ul>
            </div>
          </div>

          <div className="mt-12 flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-500">
              <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-medium underline cursor-pointer">Save this job for later</span>
            </div>
            <div className="flex gap-4">
              <div className="flex -space-x-2">
                {[1, 2, 3].map(i => (
                  <img key={i} className="w-8 h-8 rounded-full border-2 border-white" src={`https://picsum.photos/seed/${i+40}/100/100`} alt="Avatar" />
                ))}
              </div>
              <span className="text-sm text-gray-500 font-medium">3 friends work here</span>
            </div>
          </div>
        </main>
      </div>

      {/* Extension Side Panel Simulation */}
      {showExtension && (
        <aside className="fixed top-0 right-0 w-[400px] h-full z-50 animate-in slide-in-from-right duration-300">
          <ExtensionUI currentJobDescription={MOCK_JOB.description} />
          
          {/* External Close Handle */}
          <button 
            onClick={() => setShowExtension(false)}
            className="absolute top-4 -left-12 w-10 h-10 bg-white border shadow-md rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors"
          >
            <span className="text-gray-400 font-bold">×</span>
          </button>
        </aside>
      )}

      {/* Global Extension Trigger Button (Bottom Right) */}
      {!showExtension && (
        <button 
          onClick={() => setShowExtension(true)}
          className="fixed bottom-8 right-8 w-16 h-16 bg-indigo-600 rounded-full shadow-2xl flex items-center justify-center group hover:scale-110 transition-transform animate-bounce z-40"
        >
          <Zap className="w-8 h-8 text-white fill-yellow-400" />
          <div className="absolute -top-12 right-0 bg-gray-900 text-white text-[10px] px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
             Optimize Application
          </div>
        </button>
      )}
    </div>
  );
};

export default App;
