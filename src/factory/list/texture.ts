import { PNG } from "pngjs";
import { PngJsImage } from "../../util/png";
import { getMetadata } from "../../util/asset";
import { BinaryWriter } from "../../util/bwriter";
import { Resource, ResourceFactory, ResourceType } from "../resource";
import { N64Graphics, TexturePixelMultipliers, TextureType, TextureTypeUtils } from '../../util/texture-util';

class TextureResource extends Resource {
    textureType: TextureType;
    width: number;
    height: number;
    hbyte: number;
    vpixel: number;
    texDataSize: number;
    texData: Buffer;

    constructor(textureType: TextureType, width: number, height: number, hbyte: number, vpixel: number, texDataSize: number, texData: Buffer) {
        super();
        this.textureType = textureType;
        this.width = width;
        this.height = height;
        this.hbyte = hbyte;
        this.vpixel = vpixel;
        this.texDataSize = texDataSize;
        this.texData = texData;
    }
}

export default class PNGTextureFactory extends ResourceFactory<TextureResource> {
    async export(writer: BinaryWriter, resource: TextureResource): Promise<void> {
        ResourceFactory.writeHeader(writer, ResourceType.Texture, 1);

        writer.writeInt32(resource.textureType); // [0x40] Texture Type
        writer.writeInt32(resource.width);       // [0x44] Width
        writer.writeInt32(resource.height);      // [0x48] Height
        writer.writeInt32(1 << 0);               // [0x4C] Flags
        writer.writeFloat(resource.hbyte);       // [0x50] HByte Scale
        writer.writeFloat(resource.vpixel);      // [0x54] VPixel Scale
        writer.writeInt32(resource.texDataSize); // [0x58] Data Size
        writer.writeBytes(resource.texData);     // [0x5C] Texture Data
    }

    async parse(buffer: Buffer, data: any): Promise<TextureResource> {
        const { path, format } = data;

        const wrapper = new PngJsImage(PNG.sync.read(buffer));
        let texture: any = { textureType: format };
        N64Graphics.convertRawToN64(data, wrapper);

        const info = await getMetadata(path);

        if (!info) {
            console.warn(path);
        }

        const hbyte = !info ? 1.0 : (texture.width / info.width) *
            (TexturePixelMultipliers[TextureType.RGBA32bpp] / TexturePixelMultipliers[TextureTypeUtils.strToTextureType(info.format)]);
        const vpixel = !info ? 1.0 : (texture.height / info.height);

        return new TextureResource(
            texture.textureType, texture.width, texture.height, hbyte, vpixel, texture.texDataSize, texture.texData
        );
    }
}