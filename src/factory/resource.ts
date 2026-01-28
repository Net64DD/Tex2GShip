import { BinaryWriter } from "../util/bwriter";

const magic = BigInt(0xDEADBEEFDEADBEEF);

export enum ResourceType {
    Texture = 0x4F544558
};

export class Resource {};

export abstract class ResourceFactory<T extends Resource> {
    static registry: Resource[] = [];
    process: any;

    static writeHeader(writer: BinaryWriter, type: ResourceType, version: number): void {
        writer = new BinaryWriter();
        writer.writeInt32(0x00);       // [0x00] Endianness
        writer.writeInt32(type);       // [0x04] Resource Type
        writer.writeInt32(version);    // [0x08] Resource Version
        writer.writeInt64(magic);      // [0x0C] Magic
        writer.writeInt32(0);          // [0x10] Game Version
        writer.writeInt64(BigInt(0));  // [0x14] ROM CRC
        writer.writeInt32(0);          // [0x1C] ROM Enum
        while (writer.getLength() < 0x40) {
            writer.writeInt32(0);
        }
    };

    abstract export(writer: BinaryWriter, resource: T): Promise<void>;
    abstract parse(buffer: Buffer, data: any): Promise<T>;

    static async process(clazz: any, buffer: Buffer, data: any) {
        let instance = new (clazz)();
        this.registry.push(await instance.parse(buffer, data));
    }
};