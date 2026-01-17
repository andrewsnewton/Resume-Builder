import React from 'react';
import ExtensionUI from './components/ExtensionUI';

const App: React.FC = () => {
  return (
    <div className="flex flex-col h-screen w-full bg-slate-50 font-sans overflow-hidden">
      <main className="flex-1 overflow-hidden flex flex-col">
        <ExtensionUI />
      </main>
    </div>
  );
};

export default App;