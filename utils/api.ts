import { EnergyDbRecord } from '../types';

export interface ApiFile {
  name: string;
  content: string;
  ppe: string;
  hash: string;
}

export const uploadFile = async (file: File): Promise<{ success: boolean; message?: string }> => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (response.status === 409) {
      return { success: false, message: 'Plik już istnieje (wykryto duplikat)' };
    }

    if (!response.ok) {
      throw new Error(`Server error: ${response.status} ${response.statusText}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Upload error:', error);
    return { success: false, message: 'Błąd połączenia z serwerem' };
  }
};

export const fetchAllFiles = async (): Promise<ApiFile[]> => {
  try {
    const response = await fetch('/api/files');
    if (!response.ok) {
      // Log explicit server error for debugging
      console.warn(`API call failed: ${response.status} ${response.statusText}`);
      throw new Error(`Failed to fetch files: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Fetch error:', error);
    // Return empty array to allow app to continue in offline mode
    return [];
  }
};