import React, { useState } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

interface FrameUploaderProps {
  label: string;
  onImageChange: (base64: string | null) => void;
  required?: boolean;
}

export const FrameUploader: React.FC<FrameUploaderProps> = ({ label, onImageChange, required }) => {
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setPreview(base64);
        onImageChange(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const clear = () => {
    setPreview(null);
    onImageChange(null);
  };

  return (
    <div className="flex flex-col gap-2 group/field">
      <div className="flex justify-between items-center px-1">
        <span className="text-[10px] uppercase letter-spacing-1 font-bold text-sleek-text-muted group-hover/field:text-sleek-accent transition-colors">
          {label} {required && <span className="text-red-500">*</span>}
        </span>
      </div>
      <div 
        className={`relative aspect-video rounded-lg border transition-all duration-200 overflow-hidden ${
          preview 
            ? 'border-sleek-accent bg-[#1E1E22]' 
            : 'border-sleek-border-alt bg-sleek-card border-dashed hover:border-sleek-text-muted'
        }`}
      >
        {preview ? (
          <>
            <img src={preview} alt={label} className="w-full h-full object-cover" />
            <button 
              onClick={clear}
              className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-red-500/80 rounded text-white transition-all duration-200 backdrop-blur-sm"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer group/label">
            <div className="flex flex-col items-center gap-1 group-hover/label:scale-110 transition-transform duration-300">
              <Upload className="w-5 h-5 text-sleek-text-muted" />
              <span className="text-[12px] text-sleek-text-dim">+ Add Frame</span>
            </div>
            <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
          </label>
        )}
      </div>
    </div>
  );
};
