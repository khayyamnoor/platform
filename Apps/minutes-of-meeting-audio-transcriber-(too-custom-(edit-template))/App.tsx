import React, { useState } from 'react';
import { AudioRecorder } from './components/AudioRecorder';
import { TemplateSelector, WORD_TEMPLATE_INSTRUCTIONS, PV_TEMPLATE_INSTRUCTIONS } from './components/TemplateSelector';
import { TranscriptionState } from './types';

// Declare globals for libraries loaded via script tags
declare const marked: any;
declare const PizZip: any;
declare const docxtemplater: any;
declare const saveAs: any;

const TRANSLATION_LANGUAGES = ['English', 'French', 'Arabic', 'Spanish', 'German', 'Italian', 'Chinese', 'Japanese', 'Russian'];

const App: React.FC = () => {
  const [state, setState] = useState<TranscriptionState>({
    status: 'idle',
    text: null,
    error: null,
    jsonResult: null
  });
  const [template, setTemplate] = useState<string>('');
  const [context, setContext] = useState<string>("Sara is in the BD (Business Development) department.\nTarek is the PDG (CEO).\nActivity: We presented 4 automations and 9 web applications.");
  const [templateMode, setTemplateMode] = useState<'general' | 'word_template' | 'pv_meeting'>('pv_meeting');
  const [wordTemplateFile, setWordTemplateFile] = useState<ArrayBuffer | null>(null);
  const [wordTemplateName, setWordTemplateName] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState('English');

  const isWordTemplateMode = templateMode === 'word_template';
  const isPVMode = templateMode === 'pv_meeting';

  const handleStart = () => {
    setState({ ...state, status: 'processing', error: null });
  };

  const handleComplete = (text: string, json?: any) => {
    setState({ status: 'success', text, jsonResult: json, error: null });
  };

  const handleError = (error: string) => {
    setState({ status: 'error', text: null, error, jsonResult: null });
  };

  const reset = () => {
    setState({ status: 'idle', text: null, error: null, jsonResult: null });
  };

  const handleWordTemplateUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        const arrayBuffer = e.target.result as ArrayBuffer;
        setWordTemplateFile(arrayBuffer);
        setWordTemplateName(file.name);

        try {
          const zip = new PizZip(arrayBuffer);
          let detectedPlaceholders: string[] = [];
          if (zip.files['word/document.xml']) {
             const docXml = zip.files['word/document.xml'].asText();
             const rawMatches = docXml.match(/\{[a-zA-Z0-9_]+\}/g);
             if (rawMatches) detectedPlaceholders.push(...rawMatches);
          }
          
          if (detectedPlaceholders.length > 0) {
            const vars = detectedPlaceholders.map((m: string) => m.replace(/[\{\}]/g, ''));
            const uniqueVars = [...new Set(vars)];
            const newInstruction = `The uploaded Word template contains placeholders. Extract:\n${uniqueVars.map(v => `- ${v}`).join('\n')}\nReturn valid JSON.`;
            setTemplate(newInstruction);
          } else {
             setTemplate(WORD_TEMPLATE_INSTRUCTIONS);
          }
        } catch (err) {
           setTemplate(WORD_TEMPLATE_INSTRUCTIONS);
        }
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handlePrintPDF = () => {
    window.print();
  };

  const handleTranslate = async () => {
    if (!state.text && !state.jsonResult) return;
    setIsTranslating(true);
    try {
      const { translateContent } = await import('./services/geminiService');
      const contentToTranslate = state.jsonResult ? state.jsonResult : state.text;
      const isJson = !!state.jsonResult;
      
      const result = await translateContent(contentToTranslate, targetLanguage, isJson);
      
      setState({
        ...state,
        text: result.text,
        jsonResult: result.json,
        error: null
      });
    } catch (error: any) {
      alert(`Translation failed: ${error.message}`);
    } finally {
      setIsTranslating(false);
    }
  };
  
  const generatePVWordHtml = (data: any) => {
    const attendeesHtml = (data.attendees && data.attendees.length > 0 ? data.attendees : [{}, {}, {}])
      .map((att: any) => `
        <tr style="height: 30pt;">
          <td style="border: 1pt solid #444; padding: 5pt; font-family: 'Segoe UI', Arial, sans-serif;">${att.name || ''}</td>
          <td style="border: 1pt solid #444; padding: 5pt; text-align: center; color: #999; font-size: 8pt; font-style: italic; font-family: 'Segoe UI', Arial, sans-serif;">Electronic</td>
          <td style="border: 1pt solid #444; padding: 5pt; font-family: 'Segoe UI', Arial, sans-serif;">${att.function || ''}</td>
        </tr>
      `).join('');

    const tasksHtml = (data.tasks && data.tasks.length > 0 ? data.tasks : [{}, {}, {}, {}])
      .map((task: any) => `
        <tr style="height: 35pt;">
          <td style="border: 1pt solid #444; padding: 5pt; font-family: 'Segoe UI', Arial, sans-serif;">${task.task || ''}</td>
          <td style="border: 1pt solid #444; padding: 5pt; font-family: 'Segoe UI', Arial, sans-serif;">${task.owner || ''}</td>
          <td style="border: 1pt solid #444; padding: 5pt; font-family: 'Segoe UI', Arial, sans-serif;">${task.deadline || ''}</td>
          <td style="border: 1pt solid #444; padding: 5pt; text-align: center; font-family: 'Segoe UI', Arial, sans-serif;">${task.status || ''}</td>
        </tr>
      `).join('');

    const logoHtml = logoUrl 
      ? `<img src="${logoUrl}" style="max-height: 80pt; width: auto;" />`
      : `<div style="color: #C5A048; text-align: center; font-family: 'Georgia', serif;">
          <div style="font-weight: bold; font-size: 16pt; letter-spacing: 2pt;">GOLDEN CARTHAGE</div>
          <div style="font-size: 8pt; letter-spacing: 1pt;">HOTEL & RESIDENCE TUNIS</div>
         </div>`;

    return `
      <html xmlns:v="urn:schemas-microsoft-com:vml"
            xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:w="urn:schemas-microsoft-com:office:word"
            xmlns:m="http://schemas.microsoft.com/office/2004/12/omml"
            xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset='utf-8'><title>Meeting Minutes</title>
      <!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>90</w:Zoom><w:DoNotOptimizeForBrowser/></w:WordDocument></xml><![endif]-->
      <style>
        @page { size: 8.5in 11in; margin: 0.5in 0.5in 0.5in 0.5in; }
        body { font-family: 'Segoe UI', 'Helvetica', 'Arial', sans-serif; font-size: 11pt; color: #1e293b; background-color: white; }
        table { border-collapse: collapse; width: 100%; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        .green-header { background-color: #7fb442; color: #ffffff; font-weight: bold; }
        .border-thin { border: 1pt solid #444; }
      </style>
      </head>
      <body lang="FR">
        <!-- Header Container Table -->
        <table style="width: 100%; border: 1pt solid #444; margin-bottom: 10pt;">
          <tr>
            <td style="width: 35%; border-right: 1pt solid #444; text-align: center; padding: 10pt; vertical-align: middle;">${logoHtml}</td>
            <td style="width: 35%; border-right: 1pt solid #444; text-align: center; padding: 10pt; vertical-align: middle; font-size: 18pt; font-weight: bold; font-style: italic; text-transform: uppercase;">Meeting Minutes</td>
            <td style="width: 30%; font-size: 8pt; text-transform: uppercase; padding: 0;">
              <table style="width: 100%;">
                <tr><td style="border-bottom: 1pt solid #444; padding: 2pt 5pt;">REF: <span style="font-family: monospace; font-weight: bold;">${data.ref || 'QUA-ENR-03'}</span></td></tr>
                <tr><td style="border-bottom: 1pt solid #444; padding: 2pt 5pt;">VERSION: <span style="font-family: monospace; font-weight: bold;">${data.version || '00'}</span></td></tr>
                <tr><td style="border-bottom: 1pt solid #444; padding: 2pt 5pt;">DATE: <span style="font-family: monospace; font-weight: bold;">${data.date || new Date().toLocaleDateString('en-US')}</span></td></tr>
                <tr><td style="padding: 2pt 5pt;">PAGE: <span style="font-family: monospace; font-weight: bold;">1 OF 1</span></td></tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- PV Identifier -->
        <table style="width: 100%; background-color: #7fb442; border: 1pt solid #444; margin-bottom: 2pt;">
          <tr>
            <td style="padding: 5pt 10pt; color: #ffffff; font-weight: bold; font-size: 10pt;">
              MINUTES NO : <span style="font-weight: normal;">${data.pv_num || '________________'}</span>
            </td>
          </tr>
        </table>

        <!-- Metadata Section -->
        <table style="width: 100%; border: 1pt solid #444; margin-bottom: 15pt;">
          <tr>
            <td style="background-color: #7fb442; color: #ffffff; font-weight: bold; padding: 6pt; border: 1pt solid #444; width: 140pt; text-transform: uppercase; font-size: 9pt;">Date:</td>
            <td style="border: 1pt solid #444; padding: 6pt;">${data.date || '________________'}</td>
          </tr>
          <tr>
            <td style="background-color: #7fb442; color: #ffffff; font-weight: bold; padding: 6pt; border: 1pt solid #444; text-transform: uppercase; font-size: 9pt;">TEAM INVOLVED :</td>
            <td style="border: 1pt solid #444; padding: 6pt;">${data.team || '________________'}</td>
          </tr>
          <tr>
            <td style="background-color: #7fb442; color: #ffffff; font-weight: bold; padding: 6pt; border: 1pt solid #444; text-transform: uppercase; font-size: 9pt;">AGENDA :</td>
            <td style="border: 1pt solid #444; padding: 6pt;">${data.agenda || '________________'}</td>
          </tr>
        </table>

        <!-- Attendees Table -->
        <table style="width: 100%; border: 1pt solid #444; margin-bottom: 15pt;">
          <thead>
            <tr style="background-color: #7fb442;">
              <th colspan="3" style="padding: 4pt; color: #ffffff; font-weight: bold; text-align: center; border: 1pt solid #444; text-transform: uppercase; font-size: 9pt; letter-spacing: 1pt;">ATTENDEES</th>
            </tr>
            <tr style="background-color: #f8f9fa; text-align: left; font-size: 10pt; font-weight: bold;">
              <th style="border: 1pt solid #444; padding: 6pt; width: 33%;">FULL NAME</th>
              <th style="border: 1pt solid #444; padding: 6pt; width: 33%; text-align: center;">SIGNATURE</th>
              <th style="border: 1pt solid #444; padding: 6pt; width: 33%;">ROLE</th>
            </tr>
          </thead>
          <tbody>
            ${attendeesHtml}
          </tbody>
        </table>

        <!-- Narrative -->
        <p style="font-style: italic; font-size: 10pt; margin-bottom: 5pt; line-height: 1.4;">
          A meeting was held in the presence of the above members. The objective of this meeting was: 
          <span style="font-weight: bold; text-decoration: underline;">${data.objective || 'General Discussion'}</span>
        </p>
        <p style="font-size: 10pt; margin-bottom: 10pt;">Below is the status for action tracking:</p>

        <!-- Main Report Content -->
        <div style="margin-bottom: 20pt;">
          <h3 style="font-weight: bold; text-decoration: underline; font-size: 12pt; margin-bottom: 5pt; color: #000;">MEETING RESULTS REPORT :</h3>
          <div style="border: 1pt solid #444; padding: 12pt; background-color: #fafafa; min-height: 100pt; line-height: 1.6;">
            ${data.report ? data.report.replace(/\n/g, '<br/>') : 'No report generated.'}
          </div>
        </div>

        <!-- Action Items Table -->
        <h3 style="font-weight: bold; text-decoration: underline; font-size: 12pt; margin-bottom: 8pt; color: #000;">ACTION ITEMS :</h3>
        <table style="width: 100%; border: 1pt solid #444;">
          <thead>
            <tr style="background-color: #7fb442; color: #ffffff; font-weight: bold; text-align: center; font-size: 9pt;">
              <th style="border: 1pt solid #444; padding: 6pt;">ACTION TO DO</th>
              <th style="border: 1pt solid #444; padding: 6pt;">RESPONSIBLE</th>
              <th style="border: 1pt solid #444; padding: 6pt;">DEADLINE</th>
              <th style="border: 1pt solid #444; padding: 6pt;">STATUS</th>
            </tr>
          </thead>
          <tbody style="font-size: 9pt;">
            ${tasksHtml}
          </tbody>
        </table>

        <!-- Ownership Footer -->
        <div style="margin-top: 40pt; border-top: 0.5pt solid #ccc; padding-top: 10pt; text-align: center; font-size: 8pt; color: #777; font-style: italic;">
          This document is the property of Golden Carthage Tunis Hotel. Any reproduction of this document is prohibited.
        </div>
      </body>
      </html>
    `;
  };

  const handleExportWord = () => {
    // 1. Fill Word Template with Placeholders
    if (state.jsonResult && wordTemplateFile && templateMode === 'word_template') {
       try {
         const zip = new PizZip(wordTemplateFile);
         const doc = new docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
            nullGetter: () => ""
         });
         doc.render(state.jsonResult);
         const out = doc.getZip().generate({
            type: "blob",
            mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
         });
         saveAs(out, `PV_${wordTemplateName || 'Filled'}.docx`);
       } catch (error: any) {
          alert("Error filling Word template.");
       }
       return;
    }

    // 2. Export the "PV de réunion" as an EXACT mirror of the web UI
    if (templateMode === 'pv_meeting') {
      let data = state.jsonResult;
      
      // Attempt recovery if jsonResult is missing but text looks like JSON
      if (!data && state.text) {
        try {
          const possibleJson = state.text.match(/\{[\s\S]*\}/);
          if (possibleJson) data = JSON.parse(possibleJson[0]);
        } catch (e) {}
      }

      if (data) {
        const sourceHTML = generatePVWordHtml(data);
        const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
        const fileDownload = document.createElement("a");
        fileDownload.href = source;
        fileDownload.download = `PV_GoldenCarthage_${data.date?.replace(/[\/\\?%*:|"<>]/g, '-') || 'Export'}.doc`;
        fileDownload.click();
        return;
      } else {
        alert("Wait for processing to complete or valid JSON to be generated.");
      }
    }

    // 3. Fallback: Generic Markdown Transcription to Word
    if (!state.text) return;
    
    let htmlContent = typeof marked !== 'undefined' ? marked.parse(state.text) : `<pre>${state.text}</pre>`;
    const header = "<html><head><meta charset='utf-8'><style>body{font-family: 'Segoe UI', Arial; padding: 20px; line-height: 1.6;}</style></head><body>";
    const sourceHTML = header + htmlContent + "</body></html>";
    const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
    const fileDownload = document.createElement("a");
    fileDownload.href = source;
    fileDownload.download = 'Transcription_Notes.doc';
    fileDownload.click();
  };

  const getMarkdownHtml = (text: string | null) => {
    if (!text) return { __html: '' };
    return { __html: typeof marked !== 'undefined' ? marked.parse(text) : text };
  };

  const renderPVMeeting = (data: any) => {
    return (
      <div className="bg-white p-4 sm:p-8 text-slate-800 text-[11pt] leading-relaxed max-w-full overflow-hidden shadow-inner">
        {/* Header Table */}
        <div className="grid grid-cols-12 border border-slate-400 mb-6">
          <div className="col-span-4 border-r border-slate-400 p-2 flex flex-col items-center justify-center min-h-[120px]">
            {logoUrl ? (
              <img src={logoUrl} alt="Golden Carthage Logo" className="max-h-24 object-contain" />
            ) : (
              <div className="flex flex-col items-center text-[#C5A048]">
                <svg className="w-12 h-12 mb-1" viewBox="0 0 100 100" fill="currentColor">
                  <rect x="40" y="5" width="20" height="4" rx="1" />
                  <path d="M35 15 C35 25, 45 35, 55 25 C65 15, 75 25, 75 35" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                  <path d="M45 25 C45 35, 35 45, 25 35" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                  <rect x="42" y="45" width="2" height="25" rx="1" />
                  <rect x="47" y="45" width="2" height="25" rx="1" />
                  <rect x="52" y="45" width="2" height="25" rx="1" />
                  <rect x="57" y="45" width="2" height="25" rx="1" />
                </svg>
                <div className="text-[7pt] font-bold tracking-widest uppercase text-center leading-tight">Golden Carthage</div>
                <div className="text-[4pt] text-center opacity-80 font-medium">Hotel & Residence Tunis</div>
              </div>
            )}
          </div>
          <div className="col-span-4 border-r border-slate-400 p-4 flex items-center justify-center text-center font-bold text-lg italic uppercase">
            Meeting Minutes
          </div>
          <div className="col-span-4 text-[9px] uppercase">
            <div className="border-b border-slate-400 p-1 flex justify-between"><span>Ref:</span> <span className="font-mono">{data.ref || 'QUA-ENR-03'}</span></div>
            <div className="border-b border-slate-400 p-1 flex justify-between"><span>Version:</span> <span className="font-mono">{data.version || '00'}</span></div>
            <div className="border-b border-slate-400 p-1 flex justify-between"><span>Date:</span> <span className="font-mono">{data.date || new Date().toLocaleDateString('en-US')}</span></div>
            <div className="p-1 flex justify-between"><span>Page:</span> <span className="font-mono">1 of 1</span></div>
          </div>
        </div>

        {/* PV Num Bar */}
        <div className="bg-[#7fb442] text-white font-bold p-1 px-3 mb-1 border border-slate-400">
          Minutes No : <span className="font-normal">{data.pv_num || '________________'}</span>
        </div>

        {/* Info Box */}
        <div className="border border-slate-400 mb-6 overflow-hidden">
          <div className="flex border-b border-slate-400">
            <div className="bg-[#7fb442] text-white p-2 font-bold w-40 flex-shrink-0 uppercase text-xs tracking-wider">Date:</div>
            <div className="p-2 flex-grow">{data.date || '________________'}</div>
          </div>
          <div className="flex border-b border-slate-400">
            <div className="bg-[#7fb442] text-white p-2 font-bold w-40 flex-shrink-0 uppercase text-xs tracking-wider">TEAM INVOLVED :</div>
            <div className="p-2 flex-grow">{data.team || '________________'}</div>
          </div>
          <div className="flex">
            <div className="bg-[#7fb442] text-white p-2 font-bold w-40 flex-shrink-0 uppercase text-xs tracking-wider">Agenda :</div>
            <div className="p-2 flex-grow">{data.agenda || '________________'}</div>
          </div>
        </div>

        {/* Attendees Table */}
        <div className="mb-6">
          <div className="bg-[#7fb442] text-white font-bold text-center p-1 border-x border-t border-slate-400 uppercase text-xs tracking-widest">Attendees</div>
          <table className="w-full border-collapse border border-slate-400">
            <thead>
              <tr className="bg-slate-50 text-[10pt]">
                <th className="border border-slate-400 p-2 text-left w-1/3">Full Name</th>
                <th className="border border-slate-400 p-2 text-left w-1/3">Signature</th>
                <th className="border border-slate-400 p-2 text-left w-1/3">Role</th>
              </tr>
            </thead>
            <tbody>
              {(data.attendees && data.attendees.length > 0 ? data.attendees : [{}, {}, {}]).map((att: any, idx: number) => (
                <tr key={idx} className="h-8">
                  <td className="border border-slate-400 p-2">{att.name || ''}</td>
                  <td className="border border-slate-400 p-2 text-center opacity-30 text-xs italic">Electronic</td>
                  <td className="border border-slate-400 p-2">{att.function || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mb-2 italic text-sm">
          A meeting was held in the presence of the above members. The objective of this meeting was: 
          <span className="font-semibold underline ml-1">{data.objective || 'General Discussion'}</span>
        </p>
        <p className="mb-4 text-sm">Below is the status for action tracking:</p>

        <div className="mb-6">
          <h3 className="font-bold underline mb-2 uppercase text-xs tracking-wider">Meeting results report :</h3>
          <div className="min-h-[100px] border border-slate-200 p-4 rounded bg-slate-50/50 whitespace-pre-wrap leading-relaxed">
            {data.report || 'No report generated.'}
          </div>
        </div>

        {/* Action Items Table */}
        <div>
          <h3 className="font-bold underline mb-2 uppercase text-xs tracking-wider">Action Items :</h3>
          <table className="w-full border-collapse border border-slate-400 text-[9pt]">
            <thead className="bg-[#7fb442] text-white">
              <tr>
                <th className="border border-slate-400 p-2">Action to do</th>
                <th className="border border-slate-400 p-2">Responsible</th>
                <th className="border border-slate-400 p-2">Deadline</th>
                <th className="border border-slate-400 p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {(data.tasks && data.tasks.length > 0 ? data.tasks : [{}, {}, {}, {}]).map((task: any, idx: number) => (
                <tr key={idx} className="h-10">
                  <td className="border border-slate-400 p-2">{task.task || ''}</td>
                  <td className="border border-slate-400 p-2">{task.owner || ''}</td>
                  <td className="border border-slate-400 p-2">{task.deadline || ''}</td>
                  <td className="border border-slate-400 p-2 text-center">{task.status || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8 pt-4 border-t border-slate-200 text-center text-[8pt] text-slate-400 italic">
          This document is the property of Golden Carthage Tunis Hotel. Any reproduction of this document is prohibited.
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-indigo-100 selection:text-indigo-800 font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 no-print">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">
              Minutes Of Meeting Audio Transcriber
            </h1>
          </div>
          <div className="hidden sm:flex text-xs font-medium px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100">
            Powered by Marwan & Khayyam
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 sm:py-12 sm:px-6 lg:px-8">
        <div className="space-y-10">
          
          <section className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden no-print">
             <div className="p-6 pb-0">
               <TemplateSelector 
                  template={template} 
                  onTemplateChange={setTemplate}
                  context={context}
                  onContextChange={setContext}
                  mode={templateMode}
                  onModeChange={setTemplateMode}
                  wordTemplateName={wordTemplateName}
                  onWordTemplateUpload={handleWordTemplateUpload}
                  logoUrl={logoUrl}
                  onLogoChange={setLogoUrl}
               />
             </div>
             <div className="p-1 border-t border-slate-100">
               <AudioRecorder
                currentState={state.status}
                onTranscriptionStart={handleStart}
                onTranscriptionComplete={handleComplete}
                onTranscriptionError={handleError}
                template={template || (templateMode === 'pv_meeting' ? PV_TEMPLATE_INSTRUCTIONS : '')}
                context={context}
                isJsonMode={isWordTemplateMode || isPVMode}
              />
             </div>
          </section>

          {state.status === 'error' && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex items-start space-x-4 animate-fade-in no-print">
              <div className="flex-shrink-0"><svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-red-800">Processing Failed</h3>
                <p className="mt-1 text-sm text-red-700">{state.error}</p>
                <button onClick={reset} className="mt-3 text-sm font-medium text-red-600 hover:text-red-500">Try Again &rarr;</button>
              </div>
            </div>
          )}

          {state.status === 'success' && (
            <section className="space-y-4 animate-fade-in-up">
              <div className="flex items-center justify-between no-print flex-wrap gap-3">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  {state.jsonResult ? 'Professional Meeting Minutes' : 'Meeting Transcription'}
                </h2>
                <div className="flex items-center space-x-2">
                   <div className="flex items-center space-x-2 mr-4 border-r border-slate-200 pr-4">
                     <select 
                       value={targetLanguage}
                       onChange={(e) => setTargetLanguage(e.target.value)}
                       className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white text-slate-700 outline-none"
                     >
                       {TRANSLATION_LANGUAGES.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                     </select>
                     <button 
                       onClick={handleTranslate} 
                       disabled={isTranslating}
                       className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl transition-all shadow-md active:scale-95 text-sm font-bold disabled:opacity-50 flex items-center gap-2"
                     >
                       {isTranslating ? (
                         <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                       ) : (
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" /></svg>
                       )}
                       <span className="hidden sm:inline">Translate</span>
                     </button>
                   </div>
                   <button onClick={handleExportWord} className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-md active:scale-95 text-sm font-bold">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    <span>{isWordTemplateMode ? 'Download Filled Doc' : 'Export Editable Word'}</span>
                  </button>
                  <button onClick={handlePrintPDF} className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all shadow-md active:scale-95 text-sm font-bold">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    <span>Print PDF</span>
                  </button>
                  <button onClick={reset} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors" title="Start Over">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  </button>
                </div>
              </div>
              
              <div id="results-container" className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden print:shadow-none print:border-none">
                {isPVMode && state.jsonResult ? (
                   renderPVMeeting(state.jsonResult)
                ) : state.jsonResult ? (
                  <div className="p-8 bg-slate-50"><pre className="text-indigo-700 font-mono text-xs whitespace-pre-wrap leading-relaxed">{JSON.stringify(state.jsonResult, null, 2)}</pre></div>
                ) : (
                  <div className="p-8 prose prose-slate max-w-none" dangerouslySetInnerHTML={getMarkdownHtml(state.text)} />
                )}
              </div>
            </section>
          )}
        </div>
      </main>
      <footer className="py-12 text-center text-slate-400 text-xs no-print">
        <p className="font-medium tracking-wide uppercase">GOLDEN CARTHAGE TUNIS &bull; INTERNAL MANAGEMENT TOOL</p>
        <div className="mt-2 space-y-1">
          <p>&copy; {new Date().getFullYear()} AI-Assistant for Professional Secretary</p>
        </div>
      </footer>
    </div>
  );
};

export default App;