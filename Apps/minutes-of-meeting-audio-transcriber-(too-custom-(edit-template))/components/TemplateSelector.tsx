import React, { useRef, useState, useEffect } from 'react';

export interface TemplateSelectorProps {
  template: string;
  onTemplateChange: (template: string) => void;
  context: string;
  onContextChange: (context: string) => void;
  mode: 'general' | 'word_template' | 'pv_meeting';
  onModeChange: (mode: 'general' | 'word_template' | 'pv_meeting') => void;
  wordTemplateName: string | null;
  onWordTemplateUpload: (file: File) => void;
  logoUrl: string | null;
  onLogoChange: (url: string | null) => void;
}

export const PV_TEMPLATE_INSTRUCTIONS = `Extract meeting details into a JSON object matching these specific keys:
- pv_num: The meeting number or ID.
- date: The date of the meeting.
- team: The team or department involved (e.g., "EQUIPE concernée").
- agenda: The meeting agenda (e.g., "Ordre du jour").
- attendees: An array of objects with {name, function}.
- objective: The main goal of the meeting (Objet).
- report: A detailed summary of results/discussion (Rapport sur les résultats).
- tasks: An array of objects with {task, owner, deadline, status} for action items.

Return ONLY the JSON object.`;

export const WORD_TEMPLATE_INSTRUCTIONS = `Extract information to fill a Word document template. Return a valid JSON object matching the placeholders in your file. If no specific placeholders are detected, provide a general meeting summary in JSON format.`;

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  template,
  onTemplateChange,
  context,
  onContextChange,
  mode,
  onModeChange,
  wordTemplateName,
  onWordTemplateUpload,
  logoUrl,
  onLogoChange
}) => {
  const wordInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggingLogo, setIsDraggingLogo] = useState(false);

  useEffect(() => {
    if (mode === 'pv_meeting' && !template) {
       onTemplateChange(PV_TEMPLATE_INSTRUCTIONS);
    }
  }, [mode]);

  const handleModeChange = (newMode: 'general' | 'word_template' | 'pv_meeting') => {
    onModeChange(newMode);
    if (newMode === 'general') {
      onTemplateChange('');
    } else if (newMode === 'pv_meeting') {
      onTemplateChange(PV_TEMPLATE_INSTRUCTIONS);
    } else if (newMode === 'word_template') {
       if (!template || template === PV_TEMPLATE_INSTRUCTIONS) {
         onTemplateChange(WORD_TEMPLATE_INSTRUCTIONS);
       }
    }
  };

  const handleWordFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onWordTemplateUpload(file);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) onLogoChange(ev.target.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = () => setIsDragging(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')) {
      onWordTemplateUpload(file);
    } else {
      alert("Please upload a valid .docx Word file.");
    }
  };

  const onDragOverLogo = (e: React.DragEvent) => { e.preventDefault(); setIsDraggingLogo(true); };
  const onDragLeaveLogo = () => setIsDraggingLogo(false);
  const onDropLogo = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingLogo(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) onLogoChange(ev.target.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 shadow-sm animate-fade-in divide-y divide-slate-100">
      
      {/* Document Type Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
        <div>
           <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Document Type</h3>
           <p className="text-xs text-slate-500">Select the desired output format</p>
        </div>
        <div className="flex flex-wrap gap-1 bg-slate-100 rounded-lg p-1">
          <button onClick={() => handleModeChange('pv_meeting')} className={`px-4 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all ${mode === 'pv_meeting' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Meeting Minutes</button>
          <button onClick={() => handleModeChange('general')} className={`px-4 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all ${mode === 'general' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Simple Note</button>
          <button onClick={() => handleModeChange('word_template')} className={`px-4 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all ${mode === 'word_template' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Word .docx</button>
        </div>
      </div>

      {/* Template & Logo Config */}
      <div className="py-4 space-y-4">
        {mode === 'word_template' ? (
          <div className="space-y-4 animate-fade-in">
            <div onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop} className={`relative group border-2 border-dashed rounded-2xl p-6 transition-all duration-200 text-center ${isDragging ? 'border-indigo-500 bg-indigo-50 scale-[1.01]' : 'border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50'}`}>
              <div className="flex flex-col items-center">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-3 transition-colors ${isDragging ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-600 shadow-sm'}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-7 w-7 ${isDragging ? 'animate-bounce' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </div>
                <h4 className="text-sm font-bold text-indigo-900">{wordTemplateName ? `Template: ${wordTemplateName}` : 'Upload Word Design'}</h4>
                <p className="text-xs text-indigo-600/80 mb-4">Drag and drop your .docx file here to automate it.</p>
                <button onClick={() => wordInputRef.current?.click()} className="px-5 py-2 bg-white border border-indigo-200 text-indigo-700 rounded-xl text-sm font-semibold hover:bg-indigo-100 transition-colors shadow-sm">Select File</button>
                <input type="file" ref={wordInputRef} className="hidden" accept=".docx" onChange={handleWordFileUpload} />
              </div>
            </div>
          </div>
        ) : mode === 'pv_meeting' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
            {/* Logo Upload Section */}
            <div 
              onDragOver={onDragOverLogo} 
              onDragLeave={onDragLeaveLogo} 
              onDrop={onDropLogo}
              className={`border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center min-h-[140px] transition-all cursor-pointer ${isDraggingLogo ? 'border-amber-500 bg-amber-50' : 'border-slate-200 bg-slate-50 hover:border-amber-200 hover:bg-white'}`}
              onClick={() => logoInputRef.current?.click()}
            >
              {logoUrl ? (
                <div className="relative group w-full h-full flex items-center justify-center">
                  <img src={logoUrl} alt="Preview" className="max-h-24 object-contain" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-xl transition-opacity">
                    <span className="text-white text-xs font-bold">Click or drop to change logo</span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center text-slate-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-[10px] font-bold uppercase tracking-tight">Upload Hotel Logo</p>
                  <p className="text-[9px] mt-1">PNG, JPG, SVG (Drag & Drop)</p>
                </div>
              )}
              <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
            </div>

            {/* Instruction Editor */}
            <div className="bg-green-50/30 p-4 rounded-2xl border border-green-100">
              <h4 className="text-[10px] font-bold text-green-800 uppercase mb-2">Extraction Settings</h4>
              <textarea
                value={template}
                onChange={(e) => onTemplateChange(e.target.value)}
                className="w-full h-24 p-2 text-[10px] font-mono text-slate-700 bg-white border border-green-100 rounded-lg focus:ring-1 focus:ring-green-500 outline-none"
              />
            </div>
          </div>
        ) : (
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col items-center text-center">
            <h4 className="text-sm font-bold text-slate-800">Simple Note Mode</h4>
            <p className="text-xs text-slate-500 mt-1">AI will summarize the content in clean Markdown with headers and bullets.</p>
          </div>
        )}
      </div>

      {/* Context / Vocabulary Section */}
      <div className="pt-4">
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-2">Context (Names & roles)</h3>
        <textarea
          value={context}
          onChange={(e) => onContextChange(e.target.value)}
          placeholder="E.g. Sara is BD. Tarek is PDG. Meeting about Project X."
          className="w-full h-24 p-3 text-sm font-sans text-slate-700 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none shadow-inner"
        />
      </div>
    </div>
  );
};