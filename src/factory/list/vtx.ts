import type { BinaryWriter } from "../../util/bwriter";
import { Resource, ResourceFactory } from "../resource";

type Vtx = {
    ob: number[],
    flag: number,
    tc: number[],
    cn: number[],
}

class VtxResource extends Resource {
    list: Vtx[];

    constructor(list?: Vtx[]) {
        super();
        this.list = list || [];
    }
}

export default class VtxFactory extends ResourceFactory<VtxResource> {
    export(writer: BinaryWriter, resource: VtxResource): Promise<void> {
        throw new Error("Method not implemented.");
    }
    async parse(buffer: Buffer, data: any): Promise<VtxResource> {
        return new VtxResource(buffer);
    }
}