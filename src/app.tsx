import { useRef, useState } from 'preact/hooks'
import './app.css'
import type React from 'preact/compat';
import { h, type CSSProperties, type TargetedDragEvent, type TargetedEvent } from 'preact';
import { BlobReader, BlobWriter, ZipReader, ZipWriter, Uint8ArrayWriter } from '@zip.js/zip.js';
import metadata from './manifest.json';
import { PNG } from 'pngjs';
import { PngJsImage } from './util/png';
import { N64Graphics, TexturePixelMultipliers, TextureType, TextureTypeUtils, type Texture } from './util/texture-util';
import { BinaryWriter } from './util/bwriter';

const App: React.FC = () => {
  const [isOver, setIsOver] = useState<boolean>(false);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const transformPath = (oldPath: string): string | undefined => {
    const path = oldPath.replace('gfx/', 'alt/')
      .replace('.rgba32', '')
      .replace('.rgba16', '')
      .replace('.ia16', '')
      .replace('.ia8', '')
      .replace('.ia4', '')
      .replace('.i8', '')
      .replace('.i4', '')
      .replace('.ci8', '')
      .replace('.ci4', '');
    
    if(path.includes('textures/skyboxes')) {
      return undefined;
    }

    if(path.includes('skybox_tiles')) {
      let world = path.split('skybox_tiles/')[1].split('.')[0];
      return path.replace('skybox_tiles', `skyboxes/${world}`);
    }

    return path;
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

  const handleO2r = (path: string, data: Uint8Array<ArrayBuffer>): Uint8Array<ArrayBuffer> => {
    const output = new BinaryWriter();
    const raw = PNG.sync.read(Buffer.from(data));
    const wrapper = new PngJsImage(raw);
    let texture: any = {
      textureType: TextureType.RGBA32bpp,
    };
    N64Graphics.convertRawToN64(texture, wrapper);
    // console.log(`Converted texture at ${path}:`, texture);

    const info = (metadata as any)[path];

    const hbyte = !info ? 1.0 : (texture.width / info.textureWidth) * 
      (TexturePixelMultipliers[TextureType.RGBA32bpp] / TexturePixelMultipliers[TextureTypeUtils.numToTextureType(info.textureType)]);
    const vpixel = !info ? 1.0 : (texture.height / info.textureHeight);

    const magic = BigInt(0xDEADBEEFDEADBEEF);

    // OTR Header
    output.writeInt32(0x00);       // [0x00] Endianness
    output.writeInt32(0x4F544558); // [0x04] ResourceType 'OTEX'
    output.writeInt32(1);          // [0x08] Game Version
    output.writeInt64(magic);      // [0x0C] Magic
    output.writeInt32(0);          // [0x10] Resource Version
    output.writeInt8(1);           // [0x14] Custom
    output.writeInt8(0);           // [0x15]
    output.writeInt8(0);           // [0x16]
    output.writeInt8(0);           // [0x17]
    output.writeInt32(0);          // [0x18]
    output.writeInt32(0);          // [0x1C]
    while (output.getLength() < 0x40) {
      output.writeInt32(0);
    }

    // Texture Header
    output.writeInt32(texture.textureType);  // [0x40] Texture Type
    output.writeInt32(texture.width);        // [0x44] Width
    output.writeInt32(texture.height);       // [0x48] Height
    output.writeInt32(1 << 0);               // [0x4C] Flags
    output.writeFloat(hbyte);                // [0x50] HByte Scale
    output.writeFloat(vpixel);               // [0x54] VPixel Scale
    output.writeInt32(texture.texDataSize);  // [0x58] Data Size
    output.writeBytes(texture.texData);      // [0x5C] Texture Data

    // console.log('Converted to O2R:', { hbyte, vpixel, dataSize: texture.texDataSize });

    return Buffer.from(output.toBuffer());
  }

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
          if(newPath === undefined) {
            continue;
          }
          const data = await entry.getData!(new Uint8ArrayWriter());
          if(newPath.endsWith('.png')){
            try {
              const transformedData = handleO2r(newPath.replace('alt/', '').replace('.png', ''), data);
              await zipWriter.add(newPath.replace('.png', ''), new BlobReader(new Blob([transformedData])));
            } catch (e) {
              console.error(`Failed to convert texture at ${newPath}:`, e);
            }
          } else {
            await zipWriter.add(newPath, new BlobReader(new Blob([data])));
          }
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