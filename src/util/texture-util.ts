/**
 * Ported from Dart to TypeScript
 * Target: Node.js / Web (using Uint8Array)
 */

// --- Types & Enums ---

export enum TextureType {
    Error,
    RGBA32bpp,
    RGBA16bpp,
    Palette4bpp,
    Palette8bpp,
    Grayscale4bpp,
    Grayscale8bpp,
    GrayscaleAlpha4bpp,
    GrayscaleAlpha8bpp,
    GrayscaleAlpha16bpp,
}

export const TexturePixelMultipliers = {
    [TextureType.Error]: 0.0,
    [TextureType.RGBA32bpp]: 4.0,
    [TextureType.RGBA16bpp]: 2.0,
    [TextureType.Palette4bpp]: 0.5,
    [TextureType.Palette8bpp]: 1.0,
    [TextureType.Grayscale4bpp]: 0.5,
    [TextureType.Grayscale8bpp]: 1.0,
    [TextureType.GrayscaleAlpha4bpp]: 0.5,
    [TextureType.GrayscaleAlpha8bpp]: 1.0,
    [TextureType.GrayscaleAlpha16bpp]: 2.0,
}

// Helper for TextureType logic
export const TextureTypeUtils = {
    numToTextureType(num: number): TextureType {
        switch (num) {
            case 1: return TextureType.RGBA32bpp;
            case 2: return TextureType.RGBA16bpp;
            case 3: return TextureType.Palette4bpp;
            case 4: return TextureType.Palette8bpp;
            case 5: return TextureType.Grayscale4bpp;
            case 6: return TextureType.Grayscale8bpp;
            case 7: return TextureType.GrayscaleAlpha4bpp;
            case 8: return TextureType.GrayscaleAlpha8bpp;
            case 9: return TextureType.GrayscaleAlpha16bpp;
            default: throw new Error(`Unknown texture type number: ${num}`);
        }
    },
    strToTextureType(str: string): TextureType {
        switch (str) {
            case 'RGBA32': return TextureType.RGBA32bpp;
            case 'RGBA16': return TextureType.RGBA16bpp;
            case 'TLUT': return TextureType.RGBA16bpp;
            case 'CI4': return TextureType.Palette4bpp;
            case 'CI8': return TextureType.Palette8bpp;
            case 'I4': return TextureType.Grayscale4bpp;
            case 'I8': return TextureType.Grayscale8bpp;
            case 'IA4': return TextureType.GrayscaleAlpha4bpp;
            case 'IA8': return TextureType.GrayscaleAlpha8bpp;
            case 'IA16': return TextureType.GrayscaleAlpha16bpp;
            default: throw new Error(`Unknown texture type string: ${str}`);
        }
    },
    getBufferSize(type: TextureType, width: number, height: number): number {
        switch (type) {
            case TextureType.RGBA32bpp: return width * height * 4;
            case TextureType.RGBA16bpp: return width * height * 2;
            case TextureType.Palette4bpp: return Math.ceil((width * height) / 2);
            case TextureType.Palette8bpp: return width * height;
            case TextureType.Grayscale4bpp: return Math.ceil((width * height) / 2);
            case TextureType.Grayscale8bpp: return width * height;
            case TextureType.GrayscaleAlpha4bpp: return Math.ceil((width * height) / 2);
            case TextureType.GrayscaleAlpha8bpp: return width * height;
            case TextureType.GrayscaleAlpha16bpp: return width * height * 2;
            default: return 0;
        }
    }
};

export interface Pixel {
    x: number;
    y: number;
    r: number;
    g: number;
    b: number;
    a: number;
    index: number;
}

/**
 * Interface representing the Image object from the 'image' package in Dart
 */
export interface N64Image {
    width: number;
    height: number;
    numChannels: number;
    bitsPerChannel: number;
    withPalette: boolean;
    palette?: {
        setRgba(index: number, r: number, g: number, b: number, a: number): void;
    };
    getPixel(x: number, y: number): Pixel;
    getPixelSafe(x: number, y: number): Pixel;
    setPixel(x: number, y: number, color: { r: number, g: number, b: number, a: number }): void;
    setPixelR(x: number, y: number, r: number): void;
    setPixelRgba(x: number, y: number, r: number, g: number, b: number, a: number): void;
    setPixelRgb(x: number, y: number, r: number, g: number, b: number): void;
    [Symbol.iterator](): Iterator<Pixel>;
}

export interface Texture {
    width: number;
    height: number;
    texDataSize: number;
    texData: Uint8Array;
    textureType: TextureType;
    tlut?: Texture;
    toPNGBytes(): Uint8Array;
}

// --- Main Implementation ---

export class N64Graphics {
    
    /**
     * Equivalent to the N64Pixel extension
     */
    static setGrayscalePixel(image: N64Image, x: number, y: number, grayscale: number, alpha: number = 0): void {
        if (image.numChannels === 4) {
            image.setPixelRgba(x, y, grayscale, grayscale, grayscale, alpha);
        } else {
            image.setPixelRgb(x, y, grayscale, grayscale, grayscale);
        }
    }

    /**
     * Logic for hasAlpha getter
     */
    static hasAlpha(texture: Texture): boolean {
        const type = texture.textureType;
        return (
            type === TextureType.Palette4bpp ||
            type === TextureType.Palette8bpp || // Palette usually implies alpha support in this context
            type === TextureType.RGBA32bpp ||
            type === TextureType.RGBA16bpp ||
            type === TextureType.GrayscaleAlpha16bpp ||
            type === TextureType.GrayscaleAlpha8bpp ||
            type === TextureType.GrayscaleAlpha4bpp
        );
    }

    /**
     * Converts raw bytes to a PNG format Uint8Array
     */
    static pixelsToPNG(texture: Texture, data: Uint8Array, encodePngFn: (img: any) => Uint8Array, createImageFn: any): Uint8Array {
        const image = createImageFn({
            width: texture.width,
            height: texture.height,
            bytes: data.buffer,
            numChannels: 4,
        });
        return encodePngFn(image);
    }

    /**
     * Logic for convertRawToN64
     */
    static convertRawToN64(texture: Texture, image: N64Image): void {
        texture.width = image.width;
        texture.height = image.height;
        texture.texDataSize = TextureTypeUtils.getBufferSize(texture.textureType, texture.width, texture.height);
        texture.texData = new Uint8Array(texture.texDataSize);

        const { width, texData, textureType } = texture;

        switch (textureType) {
            case TextureType.RGBA16bpp:
                for (const pixel of image) {
                    const pos = ((pixel.y * width) + pixel.x) * 2;
                    const r = Math.floor(pixel.r / 8);
                    const g = Math.floor(pixel.g / 8);
                    const b = Math.floor(pixel.b / 8);
                    const alphaBit = pixel.a !== 0 ? 1 : 0;

                    const data = (r << 11) | (g << 6) | (b << 1) | alphaBit;
                    texData[pos + 0] = (data & 0xFF00) >> 8;
                    texData[pos + 1] = data & 0x00FF;
                }
                break;

            case TextureType.RGBA32bpp: {
                const mod = image.bitsPerChannel === 16 ? 256 : 1;
                for (const pixel of image) {
                    const pos = ((pixel.y * width) + pixel.x) * 4;
                    const r = Math.floor(pixel.r / mod);
                    const g = Math.floor(pixel.g / mod);
                    const b = Math.floor(pixel.b / mod);
                    const a = Math.floor(pixel.a / mod);

                    switch (image.numChannels) {
                        case 1:
                            texData.set([r, r, r, 0xFF], pos);
                            break;
                        case 2:
                            texData.set([r, r, r, g], pos);
                            break;
                        case 3:
                            texData.set([r, g, b, 0xFF], pos);
                            break;
                        case 4:
                            texData.set([r, g, b, a], pos);
                            break;
                    }
                }
                break;
            }

            case TextureType.Palette4bpp:
                for (const pixel of image) {
                    const pos = Math.floor(((pixel.y * width) + pixel.x) / 2);
                    const cr1 = pixel.index;
                    const cr2 = image.getPixelSafe(pixel.x + 1, pixel.y).index;
                    texData[pos] = ((cr1 & 0x0F) << 4) | (cr2 & 0x0F);
                }
                break;

            case TextureType.Palette8bpp:
                for (const pixel of image) {
                    const pos = (pixel.y * width) + pixel.x;
                    texData[pos] = pixel.index & 0xFF;
                }
                break;

            case TextureType.Grayscale4bpp:
                for (const pixel of image) {
                    const pos = Math.floor(((pixel.y * width) + pixel.x) / 2);
                    const r1 = pixel.r;
                    const r2 = image.getPixelSafe(pixel.x + 1, pixel.y).r;
                    texData[pos] = ((Math.floor(r1 / 16) << 4) | Math.floor(r2 / 16)) & 0xFF;
                }
                break;

            case TextureType.Grayscale8bpp:
                for (const pixel of image) {
                    const pos = (pixel.y * width) + pixel.x;
                    texData[pos] = pixel.r & 0xFF;
                }
                break;

            case TextureType.GrayscaleAlpha4bpp:
                for (const pixel of image) {
                    const pos = Math.floor(((pixel.y * width) + pixel.x) / 2);
                    const nextPixel = image.getPixelSafe(pixel.x + 1, pixel.y);
                    const alphaBit1 = pixel.a !== 0 ? 1 : 0;
                    const alphaBit2 = nextPixel.a !== 0 ? 1 : 0;

                    let data = ((Math.floor(pixel.r / 32) << 1) | alphaBit1) << 4;
                    data |= (Math.floor(nextPixel.r / 32) << 1) | alphaBit2;
                    texData[pos] = data & 0xFF;
                }
                break;

            case TextureType.GrayscaleAlpha8bpp:
                for (const pixel of image) {
                    const pos = (pixel.y * width) + pixel.x;
                    texData[pos] = ((Math.floor(pixel.r / 16) << 4) | Math.floor(pixel.a / 16)) & 0xFF;
                }
                break;

            case TextureType.GrayscaleAlpha16bpp:
                for (const pixel of image) {
                    const pos = ((pixel.y * width) + pixel.x) * 2;
                    texData[pos] = pixel.r & 0xFF;
                    texData[pos + 1] = pixel.a & 0xFF;
                }
                break;

            case TextureType.Error:
                throw new Error('Unknown texture type');
        }
    }

    /**
     * Logic for convertN64ToPNG
     */
    static convertN64ToPNG(
        texture: Texture, 
        createImageFn: any, 
        encodePngFn: (img: any) => Uint8Array,
        decodePngFn: (data: Uint8Array) => any
    ): Uint8Array | null {
        const { width, height, texData, textureType } = texture;
        const isPalette = textureType === TextureType.Palette4bpp || textureType === TextureType.Palette8bpp;

        let image: N64Image = createImageFn({
            width: width,
            height: height,
            numChannels: this.hasAlpha(texture) ? 4 : 3,
            withPalette: isPalette,
        });

        switch (textureType) {
            case TextureType.RGBA32bpp:
                image = createImageFn({
                    width: width,
                    height: height,
                    bytes: texData.buffer,
                    numChannels: 4,
                });
                break;

            case TextureType.RGBA16bpp:
                for (let y = 0; y < height; y++) {
                    for (let x = 0; x < width; x++) {
                        const pos = ((y * width) + x) * 2;
                        const data = (texData[pos] << 8) | texData[pos + 1];
                        const r = ((data & 0xF800) >> 11) * 8;
                        const g = ((data & 0x07C0) >> 6) * 8;
                        const b = ((data & 0x003E) >> 1) * 8;
                        const a = (data & 0x01) * 255;
                        image.setPixel(x, y, { r, g, b, a });
                    }
                }
                break;

            case TextureType.Palette4bpp:
                for (let y = 0; y < height; y++) {
                    for (let x = 0; x < width; x += 2) {
                        const pos = Math.floor(((y * width) + x) / 2);
                        for (let i = 0; i < 2; i++) {
                            const paletteIndex = (i === 0) ? (texData[pos] & 0xF0) >> 4 : texData[pos] & 0x0F;
                            image.setPixelR(x + i, y, paletteIndex);
                            image.palette?.setRgba(paletteIndex, paletteIndex * 16, paletteIndex * 16, paletteIndex * 16, 255);
                        }
                    }
                }
                break;

            case TextureType.Palette8bpp:
                for (let y = 0; y < height; y++) {
                    for (let x = 0; x < width; x++) {
                        const pos = (y * width) + x;
                        const grayscale = texData[pos];
                        image.setPixelR(x, y, grayscale);
                        image.palette?.setRgba(grayscale, grayscale, grayscale, grayscale, 255);
                    }
                }
                break;

            case TextureType.Grayscale4bpp:
                for (let y = 0; y < height; y++) {
                    for (let x = 0; x < width; x += 2) {
                        const pos = Math.floor(((y * width) + x) / 2);
                        for (let i = 0; i < 2; i++) {
                            const grayscale = (i === 0) ? (texData[pos] & 0xF0) : (texData[pos] & 0x0F) << 4;
                            this.setGrayscalePixel(image, x + i, y, grayscale);
                        }
                    }
                }
                break;

            case TextureType.Grayscale8bpp:
                for (let y = 0; y < height; y++) {
                    for (let x = 0; x < width; x++) {
                        const pos = (y * width) + x;
                        this.setGrayscalePixel(image, x, y, texData[pos]);
                    }
                }
                break;

            case TextureType.GrayscaleAlpha4bpp:
                for (let y = 0; y < height; y++) {
                    for (let x = 0; x < width; x += 2) {
                        const pos = Math.floor(((y * width) + x) / 2);
                        for (let i = 0; i < 2; i++) {
                            const data = (i === 0) ? (texData[pos] & 0xF0) >> 4 : texData[pos] & 0x0F;
                            const grayscale = ((data & 0x0E) >> 1) * 32;
                            const alpha = (data & 0x01) * 255;
                            this.setGrayscalePixel(image, x + i, y, grayscale, alpha);
                        }
                    }
                }
                break;

            case TextureType.GrayscaleAlpha8bpp:
                for (let y = 0; y < height; y++) {
                    for (let x = 0; x < width; x++) {
                        const pos = (y * width) + x;
                        const grayscale = texData[pos] & 0xF0;
                        const alpha = (texData[pos] & 0x0F) << 4;
                        this.setGrayscalePixel(image, x, y, grayscale, alpha);
                    }
                }
                break;

            case TextureType.GrayscaleAlpha16bpp:
                for (let y = 0; y < height; y++) {
                    for (let x = 0; x < width; x++) {
                        const pos = ((y * width) + x) * 2;
                        const grayscale = texData[pos];
                        const alpha = texData[pos + 1];
                        this.setGrayscalePixel(image, x, y, grayscale, alpha);
                    }
                }
                break;

            default:
                return null;
        }

        // Palette Handling (TLUT)
        if (isPalette && texture.tlut) {
            const palImg = decodePngFn(texture.tlut.toPNGBytes());
            for (let y = 0; y < palImg.height; y++) {
                for (let x = 0; x < palImg.width; x++) {
                    const index = y * palImg.width + x;
                    if (index >= 256) continue;
                    const p = palImg.getPixel(x, y);
                    image.palette?.setRgba(index, p.r, p.g, p.b, p.a);
                }
            }
        }

        return encodePngFn(image);
    }
}