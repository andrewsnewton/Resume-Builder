import React from 'react';
import ExtensionUI from './components/ExtensionUI';

const App: React.FC = () => {
  return (
    <div className="flex flex-col h-screen w-full bg-slate-50 font-sans">
      <main className="flex-1 flex flex-col min-h-0">
        <ExtensionUI />
      </main>
    </div>
  );
};

export default App;