import React, { useRef, useState } from 'react';
import { UploadCloud, FolderOpen, Loader2, CheckCircle, AlertCircle, Server } from 'lucide-react';
import { uploadFile } from '../utils/api';
import { ParseResult } from '../types';

interface FileUploadProps {
  onUploadComplete: () => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onUploadComplete }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);
  const [duplicates, setDuplicates] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleFolderSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setDuplicates(0);
    const files = e.target.files;

    if (!files || files.length === 0) {
      return;
    }

    const fileArray = Array.from(files) as File[];
    
    setTotalFiles(fileArray.length);
    setIsProcessing(true);
    setProgress(0);
    let duplicateCount = 0;
    let errorCount = 0;

    try {
      // Process files sequentially to avoid overwhelming the server
      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        const result = await uploadFile(file);
        
        if (!result.success) {
          if (result.message?.includes('duplikat')) {
            duplicateCount++;
          } else {
            errorCount++;
          }
        }

        setProgress(i + 1);
        
        // Small delay to keep UI responsive
        if (i % 5 === 0) await new Promise(r => setTimeout(r, 0));
      }

      setDuplicates(duplicateCount);
      
      // Notify parent to refresh data
      onUploadComplete();
      
    } catch (err) {
      console.error(err);
      setError("Wystąpił błąd krytyczny podczas wysyłania plików.");
    } finally {
      setIsProcessing(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const triggerFolderSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center text-lg font-semibold text-slate-800">
          <Server className="mr-2 h-5 w-5 text-indigo-600" />
          Import na Serwer
        </h2>
        <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
          Trwały Zapis
        </span>
      </div>
      
      <p className="mb-6 text-sm text-slate-600">
        Wybierz folder z plikami CSV. Pliki zostaną wysłane na serwer, zweryfikowane pod kątem duplikatów i posegregowane według PPE.
      </p>

      {!isProcessing ? (
        <div 
          onClick={triggerFolderSelect}
          className="group relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-10 transition-colors hover:border-indigo-500 hover:bg-indigo-50/50"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 group-hover:bg-indigo-200">
            <UploadCloud className="h-6 w-6 text-indigo-600" />
          </div>
          <div className="mt-4 text-center">
            <span className="block text-sm font-semibold text-slate-900">
              Wybierz folder do wysłania
            </span>
            <span className="mt-1 block text-xs text-slate-500">
              Automatyczna deduplikacja i segregacja
            </span>
          </div>
          {/* Custom input with webkitdirectory attribute */}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            multiple
            // @ts-ignore
            webkitdirectory=""
            directory=""
            onChange={handleFolderSelect}
          />
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center">
          <div className="mb-4 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900">Wysyłanie na serwer...</h3>
          <p className="mb-4 text-xs text-slate-500">
            Przetworzono {progress} z {totalFiles} plików
          </p>
          
          <div className="h-2.5 w-full rounded-full bg-slate-200">
            <div 
              className="h-2.5 rounded-full bg-indigo-600 transition-all duration-300 ease-out"
              style={{ width: `${totalFiles > 0 ? (progress / totalFiles) * 100 : 0}%` }}
            ></div>
          </div>
        </div>
      )}

      {duplicates > 0 && !isProcessing && (
        <div className="mt-4 flex items-center rounded-md bg-yellow-50 p-3 text-sm text-yellow-800">
          <CheckCircle className="mr-2 h-4 w-4 shrink-0" />
          Pominięto {duplicates} duplikatów (pliki już istniały).
        </div>
      )}

      {error && (
        <div className="mt-4 flex items-center rounded-md bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mr-2 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
};

export default FileUpload;