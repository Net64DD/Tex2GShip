/**
 * Simple BinaryReader is a minimal tool to read binary stream.
 * Useful for binary deserialization.
 *
 * Copyright (c) 2016 Barbosik
 */

export class BinaryReader {
    private _offset: number;
    private _buffer: Buffer;

    constructor(buffer: Buffer | Uint8Array | ArrayBuffer | string) {
        this._offset = 0;
        // Use Buffer.from for modern Node.js standards
        this._buffer = Buffer.from(buffer as any);
    }

    public get offset(): number {
        return this._offset;
    }

    public get length(): number {
        return this._buffer.length;
    }

    public readUInt8(): number {
        const value = this._buffer.readUInt8(this._offset);
        this._offset += 1;
        return value;
    }

    public readInt8(): number {
        const value = this._buffer.readInt8(this._offset);
        this._offset += 1;
        return value;
    }

    public readUInt16(): number {
        const value = this._buffer.readUInt16BE(this._offset);
        this._offset += 2;
        return value;
    }

    public readInt16(): number {
        const value = this._buffer.readInt16BE(this._offset);
        this._offset += 2;
        return value;
    }

    public readUInt32(): number {
        const value = this._buffer.readUInt32BE(this._offset);
        this._offset += 4;
        return value;
    }

    public readInt32(): number {
        const value = this._buffer.readInt32BE(this._offset);
        this._offset += 4;
        return value;
    }

    public readFloat(): number {
        const value = this._buffer.readFloatBE(this._offset);
        this._offset += 4;
        return value;
    }

    public readDouble(): number {
        const value = this._buffer.readDoubleBE(this._offset);
        this._offset += 8;
        return value;
    }

    public readBytes(length: number): Buffer {
        const value = this._buffer.slice(this._offset, this._offset + length);
        this._offset += length;
        return value;
    }

    public skipBytes(length: number): void {
        this._offset += length;
    }

    public readStringUtf8(length?: number): string {
        const targetLength = length ?? (this._buffer.length - this._offset);
        const actualLength = Math.max(0, targetLength);
        const value = this._buffer.toString('utf8', this._offset, this._offset + actualLength);
        this._offset += actualLength;
        return value;
    }

    public readStringUnicode(length?: number): string {
        const targetLength = length ?? (this._buffer.length - this._offset);
        const safeLength = Math.max(0, targetLength - (targetLength % 2));
        const value = this._buffer.toString('ucs2', this._offset, this._offset + safeLength);
        // Note: original logic adds the full length to offset, not just safeLength
        this._offset += targetLength;
        return value;
    }

    public readStringZeroUtf8(): string {
        let length = 0;
        let terminatorLength = 0;
        for (let i = this._offset; i < this._buffer.length; i++) {
            if (this._buffer.readUInt8(i) === 0) {
                terminatorLength = 1;
                break;
            }
            length++;
        }
        const value = this.readStringUtf8(length);
        this._offset += terminatorLength;
        return value;
    }

    public readStringZeroUnicode(): string {
        let length = 0;
        let terminatorLength = ((this._buffer.length - this._offset) & 1) !== 0 ? 1 : 0;
        for (let i = this._offset; i + 1 < this._buffer.length; i += 2) {
            if (this._buffer.readUInt16BE(i) === 0) {
                terminatorLength = 2;
                break;
            }
            length += 2;
        }
        const value = this.readStringUnicode(length);
        this._offset += terminatorLength;
        return value;
    }
}