import React, { useRef, useState } from 'react';

interface FileUploadProps {
  label: string;
  onFileSelect: (base64: string) => void;
  accept?: string;
  preview?: string | null;
}

export const FileUpload: React.FC<FileUploadProps> = ({ label, onFileSelect, accept = "image/*", preview }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const processFile = (file: File) => {
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onFileSelect(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    // Check if file exists and matches acceptable type (basic check for images)
    if (file && file.type.startsWith('image/')) {
        processFile(file);
    }
  };

  return (
    <div className="w-full group">
      <label className="block text-cyan-400 text-sm font-bold mb-2 uppercase tracking-wide font-space">
        {label}
      </label>
      <div 
        onClick={() => inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative w-full h-48 border-2 border-dashed 
          transition-all duration-300 cursor-pointer 
          flex flex-col items-center justify-center overflow-hidden
          ${isDragging 
            ? 'border-cyan-400 bg-cyan-900/20 scale-[1.02] shadow-[0_0_15px_rgba(6,182,212,0.2)]' 
            : 'border-slate-700 bg-slate-900/50 hover:border-cyan-500/50'
          }
          ${preview ? 'border-cyan-500/30' : ''}
        `}
      >
        <input 
          ref={inputRef}
          type="file" 
          accept={accept} 
          className="hidden" 
          onChange={handleFileChange}
        />
        
        {preview ? (
          <>
            <img src={preview} alt="Preview" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity pointer-events-none" />
            {isDragging && (
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center pointer-events-none animate-fade-in">
                <p className="text-cyan-400 font-space font-bold tracking-wider">Drop to Replace</p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center p-4 pointer-events-none">
            <svg 
              className={`w-10 h-10 mx-auto mb-2 transition-colors ${isDragging ? 'text-cyan-400 scale-110' : 'text-slate-500 group-hover:text-cyan-500'}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
            </svg>
            <p className={`text-sm font-mono transition-colors ${isDragging ? 'text-cyan-200' : 'text-slate-400'}`}>
              {isDragging ? 'Drop Image Here' : 'Click or Drag & Drop'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
