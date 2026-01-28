import { BinaryReader } from "../../util/breader";
import type { BinaryWriter } from "../../util/bwriter";
import { TextureType } from "../../util/texture-util";
import { ResourceFactory } from "../resource";
import BlobFactory from "./blob";
import GeoLayoutFactory from "./geo";
import PNGTextureFactory from "./texture";

enum DataType {
    None = 0,
    Light,
    Texture,
    Vertex,
    DisplayList,
    GeoLayout,
    AnimationValue,
    AnimationIndex,
    Animation,
    AnimationTable,
    GfxDynCmd,
    Unused,
};

class DynosResource {

}

const ReadPointer = (reader: BinaryReader) : number => {
    const pointer = reader.readInt32();
    if(pointer === 0) return 0;
    return pointer & 0x00FFFFFF;
}

const LoadLightData = async (reader: BinaryReader) : Promise<void> => {
    const name = reader.readStringZeroUtf8();
    const data = reader.readBytes(24);

    await ResourceFactory.process(BlobFactory, data, { path: name });
}

const LoadTextureData = async (reader: BinaryReader) : Promise<void> => {
    const name = reader.readStringZeroUtf8();
    const size = reader.readInt32();
    const png  = reader.readBytes(size);

    await ResourceFactory.process(PNGTextureFactory, png, { path: name, format: TextureType.RGBA32bpp });
}

const LoadGeoLayout = async (reader: BinaryReader) : Promise<void> => {
    const name = reader.readStringZeroUtf8();
    const size = reader.readInt32();

    for(let i = 0; i < size; i++) {
        const value = reader.readInt32();
        const ptr = ReadPointer(reader);
    }
}

export default class DynosFactory extends ResourceFactory<DynosResource> {
    export(writer: BinaryWriter, resource: DynosResource): Promise<void> {
        throw new Error("Method not implemented.");
    }
    async parse(buffer: Buffer, data: any): Promise<DynosResource> {
        let resource = new DynosResource();
        let reader: BinaryReader = new BinaryReader(buffer);

        for(let done = false; !done;) {
            switch(buffer.readUInt8(0)) {
                case DataType.Light: await LoadLightData(reader); break;
                case DataType.Texture: await LoadTextureData(reader); break;
                case DataType.Vertex: {} break;
                case DataType.DisplayList: {} break;
                case DataType.GeoLayout: await LoadGeoLayout(reader); break;
                case DataType.Animation: {} break;
                case DataType.AnimationTable: {} break;
                case DataType.GfxDynCmd: {} break;
                default: {
                    done = true;
                    break;
                }
            }
        }

        return resource;
    }

}