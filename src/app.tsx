import { useRef, useState } from 'preact/hooks'
import './app.css'
import type React from 'preact/compat';
import type { CSSProperties, TargetedDragEvent, TargetedEvent } from 'preact';
import { BlobReader, BlobWriter, ZipReader, ZipWriter, Uint8ArrayWriter } from '@zip.js/zip.js';

const App: React.FC = () => {
  const [isOver, setIsOver] = useState<boolean>(false);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const transformPath = (oldPath: string): string => {
    return oldPath.replace('gfx/', 'alt/')
      .replace('.rgba32', '')
      .replace('.rgba16', '')
      .replace('.ia16', '')
      .replace('.ia8', '')
      .replace('.ia4', '')
      .replace('.i8', '')
      .replace('.i4', '')
      .replace('.ci8', '')
      .replace('.ci4', '');
  };

  const validateAndSetFile = (file: File): void => {
    setError(null);
    setProgress(0);
    if (file.name.endsWith('.zip')) {
      setFile(file);
    } else {
      setError("Invalid file type. Please upload a .zip texture pack.");
      setFile(null);
    }
  };

  const handleDragOver = (e: TargetedDragEvent<HTMLDivElement>) => { e.preventDefault(); setIsOver(true); };
  const handleDragLeave = () => setIsOver(false);
  const handleDrop = (e: TargetedDragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsOver(false);
    const droppedFile = e.dataTransfer!.files[0];
    if (droppedFile) validateAndSetFile(droppedFile);
  };

  const handleFileChange = (e: TargetedEvent<HTMLInputElement, Event>) => {
    const selectedFile = e.currentTarget.files?.[0];
    if (selectedFile) validateAndSetFile(selectedFile);
  };

  const handleDownload = async (): Promise<void> => {
    if (!file) return;

    setIsProcessing(true);
    setProgress(0);
    setError(null);

    try {
      const zipReader = new ZipReader(new BlobReader(file));
      const entries = await zipReader.getEntries();

      const blobWriter = new BlobWriter("application/zip");
      const zipWriter = new ZipWriter(blobWriter);

      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        if (!entry.directory) {
          const newPath = transformPath(entry.filename);
          const data = await entry.getData!(new Uint8ArrayWriter());
          await zipWriter.add(newPath, new BlobReader(new Blob([data])));
        }

        setProgress(Math.round(((i + 1) / entries.length) * 100));
      }

      await zipWriter.close();
      const resultBlob = await blobWriter.getData();
      const url = URL.createObjectURL(resultBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `cnv_${file.name}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      await zipReader.close();
    } catch (err) {
      console.error(err);
      setError("Failed to process ZIP file. The file might be corrupted.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Texture Pack Converter</h1>
        <p style={styles.subtitle}>Only sm64-port texture packs (.zip)</p>

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isProcessing && fileInputRef.current?.click()}
          style={{
            ...styles.dropzone,
            backgroundColor: isOver ? '#4a4a4a' : '#333',
            borderColor: error ? '#ff4d4d' : (isOver ? '#666' : '#555'),
            opacity: isProcessing ? 0.6 : 1,
            cursor: isProcessing ? 'wait' : 'pointer'
          }}
        >
          <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} accept=".zip"/>
          <span style={styles.label}>File</span>
          <div style={styles.fileInput}>
            <button style={styles.chooseFileButton} disabled={isProcessing}>Choose File</button>
            <span style={styles.fileName}>{file ? file.name : 'No file chosen'}</span>
          </div>
        </div>

        {error && <p style={styles.errorText}>{error}</p>}

        {isProcessing && (
          <div style={styles.progressContainer}>
            <div style={{ ...styles.progressBar, width: `${progress}%` }} />
            <span style={styles.progressLabel}>{progress}%</span>
          </div>
        )}

        <button 
          onClick={handleDownload} 
          disabled={!file || isProcessing}
          style={{
            ...styles.downloadButton,
            backgroundColor: (file && !isProcessing) ? '#007bff' : '#555',
            cursor: (file && !isProcessing) ? 'pointer' : 'not-allowed',
            color: (file && !isProcessing) ? '#fff' : '#aaa'
          }}
        >
          {isProcessing ? 'Processing...' : 'Convert'}
        </button>
        <p style={{ marginTop: '20px', marginBottom: '0',  fontSize: '12px', color: '#666' }}>Made with ❤️ by Lywx</p>
      </div>
    </div>
  );
};

const styles: { [key: string]: CSSProperties } = {
  container: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'sans-serif', color: '#eee' },
  card: { backgroundColor: '#333', padding: '40px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', textAlign: 'center', width: '450px', border: '1px solid #444' },
  title: { margin: '0 0 5px 0', fontSize: '24px', fontWeight: 'bold', color: '#ddd' },
  subtitle: { margin: '0 0 30px 0', fontSize: '13px', color: '#999' },
  dropzone: { display: 'flex', alignItems: 'center', border: '1px solid #555', borderRadius: '4px', padding: '10px 15px', marginBottom: '10px', transition: 'all 0.2s' },
  label: { marginRight: '20px', fontWeight: 'bold', color: '#ccc' },
  fileInput: { display: 'flex', alignItems: 'center', flex: 1 },
  chooseFileButton: { padding: '6px 12px', border: '1px solid #777', backgroundColor: '#eee', color: '#333', borderRadius: '3px', fontSize: '12px', marginRight: '10px' },
  fileName: { fontSize: '13px', color: '#aaa', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' },
  errorText: { color: '#ff4d4d', fontSize: '12px', marginBottom: '15px', textAlign: 'left' },
  progressContainer: { width: '100%', height: '20px', backgroundColor: '#222', borderRadius: '5px', marginBottom: '20px', position: 'relative', overflow: 'hidden' },
  progressBar: { height: '100%', backgroundColor: '#007bff', transition: 'width 0.1s ease' },
  progressLabel: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '10px', color: '#fff', fontWeight: 'bold' },
  downloadButton: { width: '100%', padding: '12px', border: 'none', borderRadius: '4px', fontSize: '16px', fontWeight: 'bold' },
};

export default App;