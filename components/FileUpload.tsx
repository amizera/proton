import React, { useRef, useState } from 'react';
import { UploadCloud, FolderOpen, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { processEnergyFiles } from '../utils/csvParser';
import { ParseResult } from '../types';

interface FileUploadProps {
  onDataReady: (result: ParseResult) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onDataReady }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleFolderSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const files = e.target.files;

    if (!files || files.length === 0) {
      return;
    }

    // Convert FileList to Array and filter for likely CSV/Text files if needed
    // Assuming all files in folder are relevant or parser will skip invalid ones
    const fileArray = Array.from(files) as File[];
    
    setTotalFiles(fileArray.length);
    setIsProcessing(true);
    setProgress(0);

    try {
      // Process files in batch
      const result = await processEnergyFiles(fileArray, (completedCount) => {
        setProgress(completedCount);
      });
      
      onDataReady(result);
    } catch (err) {
      console.error(err);
      setError("Wystąpił błąd podczas przetwarzania plików. Sprawdź format danych.");
    } finally {
      setIsProcessing(false);
      // Reset input so same folder can be selected again if needed
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
          <UploadCloud className="mr-2 h-5 w-5 text-indigo-600" />
          Import Danych OSD
        </h2>
        <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
          Wybór Folderu
        </span>
      </div>
      
      <p className="mb-6 text-sm text-slate-600">
        Wybierz folder zawierający pliki CSV od operatora. System automatycznie wczyta wszystkie pliki (nawet tysiące), połączy dane i wygeneruje raport.
      </p>

      {!isProcessing ? (
        <div 
          onClick={triggerFolderSelect}
          className="group relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-10 transition-colors hover:border-indigo-500 hover:bg-indigo-50/50"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 group-hover:bg-indigo-200">
            <FolderOpen className="h-6 w-6 text-indigo-600" />
          </div>
          <div className="mt-4 text-center">
            <span className="block text-sm font-semibold text-slate-900">
              Kliknij, aby wybrać folder
            </span>
            <span className="mt-1 block text-xs text-slate-500">
              Obsługuje setki plików jednocześnie
            </span>
          </div>
          {/* Custom input with webkitdirectory attribute */}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            multiple
            // @ts-ignore - webkitdirectory is non-standard but supported in modern browsers
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
          <h3 className="text-sm font-semibold text-slate-900">Przetwarzanie plików...</h3>
          <p className="mb-4 text-xs text-slate-500">
            Przeanalizowano {progress} z {totalFiles} plików
          </p>
          
          <div className="h-2.5 w-full rounded-full bg-slate-200">
            <div 
              className="h-2.5 rounded-full bg-indigo-600 transition-all duration-300 ease-out"
              style={{ width: `${totalFiles > 0 ? (progress / totalFiles) * 100 : 0}%` }}
            ></div>
          </div>
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