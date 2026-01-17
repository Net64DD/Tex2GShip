/**
 * Simple BinaryWriter is a minimal tool to write binary stream with unpredictable size.
 * Useful for binary serialization.
 *
 * Copyright (c) 2016 Barbosik
 * Ported to TypeScript in 2026
 */

export class BinaryWriter {
    private _buffer: Buffer;
    private _length: number;

    constructor(size?: number) {
        const initialSize = (!size || size <= 0) 
            ? Buffer.poolSize / 2 
            : size;
        
        this._buffer = Buffer.alloc(initialSize);
        this._length = 0;
    }

    private _checkAlloc(size: number): void {
        const needed = this._length + size;
        if (this._buffer.length >= needed) return;

        const chunk = Math.max(Buffer.poolSize / 2, 1024);
        let chunkCount = Math.floor(needed / chunk);
        
        if ((needed % chunk) > 0) {
            chunkCount += 1;
        }

        const newBuffer = Buffer.alloc(chunkCount * chunk);
        this._buffer.copy(newBuffer, 0, 0, this._length);
        this._buffer = newBuffer;
    }

    public writeUInt8(value: number): void {
        this._checkAlloc(1);
        this._buffer[this._length++] = value;
    }

    public writeInt8(value: number): void {
        this._checkAlloc(1);
        this._buffer[this._length++] = value;
    }

    public writeUInt16(value: number): void {
        this._checkAlloc(2);
        this._buffer[this._length++] = value;
        this._buffer[this._length++] = value >> 8;
    }

    public writeInt16(value: number): void {
        this._checkAlloc(2);
        this._buffer[this._length++] = value;
        this._buffer[this._length++] = value >> 8;
    }

    public writeUInt32(value: number): void {
        this._checkAlloc(4);
        this._buffer[this._length++] = value;
        this._buffer[this._length++] = value >> 8;
        this._buffer[this._length++] = value >> 16;
        this._buffer[this._length++] = value >> 24;
    }

    public writeInt32(value: number): void {
        this._checkAlloc(4);
        this._buffer[this._length++] = value;
        this._buffer[this._length++] = value >> 8;
        this._buffer[this._length++] = value >> 16;
        this._buffer[this._length++] = value >> 24;
    }

    public writeInt64(value: bigint): void {
        this._checkAlloc(8);
        this._buffer[this._length++] = Number(value & BigInt(0xFF));
        this._buffer[this._length++] = Number((value >> BigInt(8)) & BigInt(0xFF));
        this._buffer[this._length++] = Number((value >> BigInt(16)) & BigInt(0xFF));
        this._buffer[this._length++] = Number((value >> BigInt(24)) & BigInt(0xFF));
        this._buffer[this._length++] = Number((value >> BigInt(32)) & BigInt(0xFF));
        this._buffer[this._length++] = Number((value >> BigInt(40)) & BigInt(0xFF));
        this._buffer[this._length++] = Number((value >> BigInt(48)) & BigInt(0xFF));
        this._buffer[this._length++] = Number((value >> BigInt(56)) & BigInt(0xFF));
    }

    public writeFloat(value: number): void {
        this._checkAlloc(4);
        this._buffer.writeFloatLE(value, this._length);
        this._length += 4;
    }

    public writeDouble(value: number): void {
        this._checkAlloc(8);
        this._buffer.writeDoubleLE(value, this._length);
        this._length += 8;
    }

    public writeBytes(data: Buffer | Uint8Array): void {
        this._checkAlloc(data.length);
        Buffer.from(data).copy(this._buffer, this._length, 0, data.length);
        this._length += data.length;
    }

    public writeStringUtf8(value: string): void {
        const length = Buffer.byteLength(value, 'utf8');
        this._checkAlloc(length);
        this._buffer.write(value, this._length, 'utf8');
        this._length += length;
    }

    public writeStringUnicode(value: string): void {
        const length = Buffer.byteLength(value, 'ucs2');
        this._checkAlloc(length);
        this._buffer.write(value, this._length, 'ucs2');
        this._length += length;
    }

    public writeStringZeroUtf8(value: string): void {
        this.writeStringUtf8(value);
        this.writeUInt8(0);
    }

    public writeStringZeroUnicode(value: string): void {
        this.writeStringUnicode(value);
        this.writeUInt16(0);
    }

    public getLength(): number {
        return this._length;
    }

    public reset(): void {
        this._length = 0;
    }

    public toBuffer(): Buffer {
        // Creates a new Buffer containing only the written data
        return Buffer.from(this._buffer.subarray(0, this._length));
    }
}