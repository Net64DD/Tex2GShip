import { PNG } from 'pngjs';
import type { N64Image, Pixel } from './texture-util';

export class PngJsImage implements N64Image {
    constructor(public png: PNG) {}

    withPalette: boolean = false;
    palette?: { setRgba(index: number, r: number, g: number, b: number, a: number): void; } | undefined;

    setPixel(x: number, y: number, _color: { r: number; g: number; b: number; a: number; }): void {
        throw new Error("Method not implemented.");
    }

    setPixelR(x: number, y: number, r: number): void {
        throw new Error("Method not implemented.");
    }

    get width() { return this.png.width; }
    get height() { return this.png.height; }
    
    // pngjs usually handles 8-bit channels (RGBA = 4 channels)
    get numChannels() { return 4; }
    get bitsPerChannel() { return 8; }

    /**
     * Helper to get pixel data at coordinates
     */
    getPixel(x: number, y: number): Pixel {
        // Handle out of bounds by clamping or returning empty
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return { x, y, r: 0, g: 0, b: 0, a: 0, index: 0 };
        }

        const idx = (this.width * y + x) << 2;
        return {
            x,
            y,
            r: this.png.data[idx],
            g: this.png.data[idx + 1],
            b: this.png.data[idx + 2],
            a: this.png.data[idx + 3],
            // In pngjs, we treat the Red channel as the index for paletted images
            index: this.png.data[idx] 
        };
    }

    /**
     * Equivalent to Dart's getPixelSafe (handles bounds)
     */
    getPixelSafe(x: number, y: number): Pixel {
        return this.getPixel(
            Math.max(0, Math.min(x, this.width - 1)),
            Math.max(0, Math.min(y, this.height - 1))
        );
    }

    setPixelRgba(x: number, y: number, r: number, g: number, b: number, a: number): void {
        const idx = (this.width * y + x) << 2;
        this.png.data[idx] = r;
        this.png.data[idx + 1] = g;
        this.png.data[idx + 2] = b;
        this.png.data[idx + 3] = a;
    }

    setPixelRgb(x: number, y: number, r: number, g: number, b: number): void {
        this.setPixelRgba(x, y, r, g, b, 255);
    }

    setPixelIndex(x: number, y: number, index: number): void {
        // For paletted textures, we store the index in the RGB channels 
        // and usually a full alpha for the PNG representation.
        this.setPixelRgba(x, y, index, index, index, 255);
    }

    /**
     * Implements iterator so you can use 'for (const pixel of image)'
     */
    *
    [Symbol.iterator](): IterableIterator<Pixel> {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                yield this.getPixel(x, y);
            }
        }
    }
}