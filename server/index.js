import express from 'express';
import multer from 'multer';
import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import cors from 'cors';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// Konfiguracja folderów
const STORAGE_DIR = path.join(__dirname, '..', 'storage');
const MANIFEST_PATH = path.join(STORAGE_DIR, 'manifest.json');

// Upewnij się, że katalogi istnieją
fs.ensureDirSync(STORAGE_DIR);
if (!fs.existsSync(MANIFEST_PATH)) {
  fs.writeJsonSync(MANIFEST_PATH, {});
}

app.use(cors());
app.use(express.json());

// Konfiguracja Multer (pamięć tymczasowa, przetwarzamy bufor)
const upload = multer({ storage: multer.memoryStorage() });

// Funkcja pomocnicza: Obliczanie hash SHA-256 pliku
const calculateHash = (buffer) => {
  return crypto.createHash('sha256').update(buffer).digest('hex');
};

// Funkcja pomocnicza: Znajdowanie PPE w treści pliku
// Szukamy w pierwszych liniach ciągu znaków, który wygląda jak PPE
const extractPPE = (buffer) => {
  const content = buffer.toString('utf-8');
  const lines = content.split('\n').slice(0, 20); // Sprawdź pierwsze 20 linii

  for (const line of lines) {
    const parts = line.split(';');
    
    // Sprawdź kod operatora/spółdzielni (kSE)
    // Format: kSE;SEPN;;...
    if (line.startsWith('kSE;') && parts[1]) {
      return parts[1].trim();
    }
    
    // Sprawdź standardowe dane, kolumna 0 to zazwyczaj PPE
    // Ignorujemy nagłówki
    const ppeCandidate = parts[0]?.trim();
    if (ppeCandidate && 
        ppeCandidate.length > 5 && 
        !['kOSD', 'kSE', 'DCW', 'DD', 'VV', 'Kod_PPE'].includes(ppeCandidate)) {
      return ppeCandidate;
    }
  }
  return 'NIEZNANE_PPE';
};

// Endpoint: Upload plików
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'Brak pliku' });
    }

    // 1. Sprawdź unikalność (Hash)
    const fileHash = calculateHash(file.buffer);
    const manifest = await fs.readJson(MANIFEST_PATH);

    if (manifest[fileHash]) {
      return res.status(409).json({ 
        error: 'Duplikat', 
        message: `Ten plik już istnieje w systemie jako: ${manifest[fileHash].path}` 
      });
    }

    // 2. Wyciągnij PPE i ustal ścieżkę
    const ppe = extractPPE(file.buffer);
    const safeFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const targetDir = path.join(STORAGE_DIR, ppe);
    const targetPath = path.join(targetDir, safeFilename);

    // 3. Zapisz plik
    await fs.ensureDir(targetDir);
    
    // Sprawdź czy nazwa pliku nie jest zajęta (jeśli treść inna, ale nazwa ta sama)
    let finalPath = targetPath;
    if (await fs.pathExists(targetPath)) {
      const parsed = path.parse(safeFilename);
      finalPath = path.join(targetDir, `${parsed.name}_${Date.now()}${parsed.ext}`);
    }

    await fs.writeFile(finalPath, file.buffer);

    // 4. Zaktualizuj manifest
    manifest[fileHash] = {
      originalName: file.originalname,
      storedName: path.basename(finalPath),
      ppe: ppe,
      path: path.relative(STORAGE_DIR, finalPath),
      uploadedAt: new Date().toISOString()
    };
    await fs.writeJson(MANIFEST_PATH, manifest, { spaces: 2 });

    console.log(`[UPLOAD] Zapisano plik dla PPE: ${ppe} -> ${finalPath}`);

    res.json({ 
      success: true, 
      ppe, 
      filename: path.basename(finalPath) 
    });

  } catch (error) {
    console.error('Błąd uploadu:', error);
    res.status(500).json({ error: 'Błąd serwera podczas zapisu pliku' });
  }
});

// Endpoint: Pobranie listy wszystkich plików (dla Frontendu)
app.get('/api/files', async (req, res) => {
  try {
    const manifest = await fs.readJson(MANIFEST_PATH);
    const files = [];

    for (const hash in manifest) {
      const entry = manifest[hash];
      // Odczytaj treść pliku, aby wysłać ją do frontendu do parsowania
      // UWAGA: W produkcji lepiej wysyłać to strumieniowo lub paginować, 
      // ale dla celów tego demo wysyłamy tekst.
      const fullPath = path.join(STORAGE_DIR, entry.path);
      
      try {
        const content = await fs.readFile(fullPath, 'utf-8'); // Zakładamy UTF-8 lub konwersję
        files.push({
          name: entry.originalName,
          content: content,
          ppe: entry.ppe,
          hash: hash
        });
      } catch (err) {
        console.warn(`Nie znaleziono pliku fizycznego dla wpisu: ${entry.path}`);
      }
    }

    res.json(files);
  } catch (error) {
    // Jeśli manifest nie istnieje, zwróć pustą listę
    res.json([]);
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Storage path: ${STORAGE_DIR}`);
});