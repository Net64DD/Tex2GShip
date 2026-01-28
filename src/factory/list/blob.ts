import type { BinaryWriter } from "../../util/bwriter";
import { Resource, ResourceFactory } from "../resource";

class BlobResource extends Resource {
    data: Buffer;

    constructor(data?: Buffer) {
        super();
        this.data = data || Buffer.alloc(0);
    }
}

export default class BlobFactory extends ResourceFactory<BlobResource> {
    export(writer: BinaryWriter, resource: BlobResource): Promise<void> {
        throw new Error("Method not implemented.");
    }
    async parse(buffer: Buffer, data: any): Promise<BlobResource> {
        return new BlobResource(buffer);
    }
}