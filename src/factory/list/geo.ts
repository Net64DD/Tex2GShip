import type { Vec3 } from "../../util/asset";
import type { BinaryWriter } from "../../util/bwriter";
import { ResourceFactory } from "../resource";

export const CMD_SIZE_SHIFT = (4 >> 3);

enum GeoOpcode {
    BranchAndLink,
    End,
    Branch,
    Return,
    OpenNode,
    CloseNode,
    AssignAsView,
    UpdateNodeFlags,
    NodeRoot,
    NodeOrthoProjection,
    NodePerspective,
    NodeStart,
    NodeMasterList,
    NodeLevelOfDetail,
    NodeSwitchCase,
    NodeCamera,
    NodeTranslationRotation,
    NodeTranslation,
    NodeRotation,
    NodeAnimatedPart,
    NodeBillboard,
    NodeDisplayList,
    NodeShadow,
    NodeObjectParent,
    NodeAsm,
    NodeBackground,
    NOP,
    CopyView,
    NodeHeldObj,
    NodeScale,
    NOP2,
    NOP3,
    NodeCullingRadius,
};

enum GeoArgumentType {
    U8, S8, U16, S16, U32, S32, U64, VEC2F, VEC3F, VEC3S, VEC3I, VEC4F, VEC4S, STRING
};

type GeoCommand = {
    opcode: GeoOpcode;
    args: (number | bigint | Vec3[] | string)[];
    skip?: boolean;
}

class GeoLayoutResource {
    commands: GeoCommand[];

    constructor() {
        this.commands = [];
    }
};

export default class GeoLayoutFactory extends ResourceFactory<GeoLayoutResource> {

    export(writer: BinaryWriter, resource: GeoLayoutResource): Promise<void> {
        throw new Error("Method not implemented.");
    }

    async parse(buffer: Buffer, _: any): Promise<GeoLayoutResource> {
        const resource = new GeoLayoutResource();

        let cmd = 0;
        let processing = true;
        let openCount = 0;

        while (processing && cmd < buffer.length) {
            const opcode = buffer.readUInt8(cmd) as GeoOpcode;
            let skip = false;
            let args: any[] = [];

            const cur_u8  = (off: number) => buffer.readUInt8(cmd + off);
            const cur_s16 = (off: number) => buffer.readInt16BE(cmd + off);
            const cur_u32 = (off: number) => buffer.readUInt32BE(cmd + off);

            switch (opcode) {
                case GeoOpcode.BranchAndLink: {
                    const ptr = cur_u32(0x04);
                    if (ptr === 0) processing = false;
                    args.push(register(ptr, "SM64:GEO_LAYOUT"));
                    cmd += 0x08 << CMD_SIZE_SHIFT;
                    break;
                }

                case GeoOpcode.End:
                case GeoOpcode.Return:
                    processing = false;
                    break;

                case GeoOpcode.Branch: {
                    args.push(cur_u8(0x01));
                    args.push(register(cur_u32(0x04), "SM64:GEO_LAYOUT"));
                    cmd += 0x08 << CMD_SIZE_SHIFT;
                    break;
                }

                case GeoOpcode.OpenNode:
                    openCount++;
                    cmd += 0x04 << CMD_SIZE_SHIFT;
                    break;

                case GeoOpcode.CloseNode:
                    cmd += 0x04 << CMD_SIZE_SHIFT;
                    if (openCount - 1 < 0) skip = true;
                    else openCount--;
                    break;

                case GeoOpcode.AssignAsView:
                    args.push(cur_s16(0x02));
                    cmd += 0x04 << CMD_SIZE_SHIFT;
                    break;

                case GeoOpcode.UpdateNodeFlags:
                    args.push(cur_u8(0x01), cur_s16(0x02));
                    cmd += 0x04 << CMD_SIZE_SHIFT;
                    break;

                case GeoOpcode.NodeRoot:
                    args.push(cur_s16(0x02), cur_s16(0x04), cur_s16(0x06), cur_s16(0x08), cur_s16(0x0A));
                    cmd += 0x0C << CMD_SIZE_SHIFT;
                    break;

                case GeoOpcode.NodeOrthoProjection:
                    args.push(cur_s16(0x02));
                    cmd += 0x04 << CMD_SIZE_SHIFT;
                    break;

                case GeoOpcode.NodePerspective: {
                    const opt = cur_u8(0x01);
                    args.push(opt, cur_s16(0x02), cur_s16(0x04), cur_s16(0x06));
                    cmd += 0x08 << CMD_SIZE_SHIFT;
                    if (opt !== 0) {
                        const ptr = cur_u32(0x00);
                        args.push(ptr);
                        // storeFunc(ptr);
                        cmd += 0x04 << CMD_SIZE_SHIFT;
                    }
                    break;
                }

                case GeoOpcode.NodeStart:
                case GeoOpcode.NodeObjectParent:
                    cmd += 0x04 << CMD_SIZE_SHIFT;
                    break;

                case GeoOpcode.NodeMasterList:
                    args.push(cur_u8(0x01));
                    cmd += 0x04 << CMD_SIZE_SHIFT;
                    break;

                case GeoOpcode.NodeLevelOfDetail:
                    args.push(cur_s16(0x04), cur_s16(0x06));
                    cmd += 0x08 << CMD_SIZE_SHIFT;
                    break;

                case GeoOpcode.NodeSwitchCase: {
                    const ptr = cur_u32(0x04);
                    args.push(cur_s16(0x02), ptr);
                    // storeFunc(ptr);
                    cmd += 0x08 << CMD_SIZE_SHIFT;
                    break;
                }

                case GeoOpcode.NodeCamera: {
                    const { vec: pos } = readVec3s(buffer, cmd + 0x04);
                    const { vec: focus } = readVec3s(buffer, cmd + 0x0A);
                    const ptr = cur_u32(0x10);
                    args.push(cur_s16(0x02), pos, focus, ptr);
                    // storeFunc(ptr);
                    cmd += 0x14 << CMD_SIZE_SHIFT;
                    break;
                }

                case GeoOpcode.NodeTranslationRotation: {
                    const params = cur_u8(0x01);
                    args.push(params);
                    let localOff = cmd;

                    switch ((params & 0x70) >> 4) {
                        case 0: {
                            const t = readVec3s(buffer, localOff + 4);
                            const r = readVec3s(buffer, t.nextOffset);
                            args.push(t.vec, r.vec);
                            localOff = r.nextOffset;
                            break;
                        }
                        case 1: {
                            const t = readVec3s(buffer, localOff + 2);
                            args.push(t.vec);
                            localOff = t.nextOffset;
                            break;
                        }
                        case 2: {
                            const r = readVec3s(buffer, localOff + 2);
                            args.push(r.vec);
                            localOff = r.nextOffset;
                            break;
                        }
                        case 3: {
                            args.push(buffer.readInt16BE(localOff + 2));
                            localOff += (0x02 << CMD_SIZE_SHIFT) + 2;
                            break;
                        }
                    }

                    if (params & 0x80) {
                        const ptr = buffer.readUInt32BE(localOff);
                        args.push(register(ptr, "GFX"));
                        localOff += 4 << CMD_SIZE_SHIFT;
                    }
                    cmd = localOff;
                    break;
                }

                case GeoOpcode.NodeTranslation:
                case GeoOpcode.NodeRotation: {
                    const params = cur_u8(0x01);
                    const { vec, nextOffset } = readVec3s(buffer, cmd + 2);
                    args.push(params, vec);
                    let localOff = nextOffset;
                    if (params & 0x80) {
                        args.push(register(buffer.readUInt32BE(localOff), "GFX"));
                        localOff += 4 << CMD_SIZE_SHIFT;
                    }
                    cmd = localOff;
                    break;
                }

                case GeoOpcode.NodeAnimatedPart: {
                    const { vec } = readVec3s(buffer, cmd + 2);
                    const ptr = cur_u32(0x08);
                    args.push(cur_u8(0x01), vec, register(ptr, "GFX"));
                    cmd += 0x0C << CMD_SIZE_SHIFT;
                    break;
                }

                case GeoOpcode.NodeBillboard: {
                    const params = cur_u8(0x01);
                    const { vec, nextOffset } = readVec3s(buffer, cmd + 2);
                    args.push(params, vec);
                    let localOff = nextOffset;
                    if (params & 0x80) {
                        args.push(register(buffer.readUInt32BE(localOff), "GFX"));
                        localOff += 4 << CMD_SIZE_SHIFT;
                    }
                    cmd = localOff;
                    break;
                }

                case GeoOpcode.NodeDisplayList:
                    args.push(cur_u8(0x01), register(cur_u32(0x04), "GFX"));
                    cmd += 0x08 << CMD_SIZE_SHIFT;
                    break;

                case GeoOpcode.NodeShadow:
                    args.push(cur_s16(0x02), cur_s16(0x04), cur_s16(0x06));
                    cmd += 0x08 << CMD_SIZE_SHIFT;
                    break;

                case GeoOpcode.NodeAsm:
                case GeoOpcode.NodeBackground: {
                    const ptr = cur_u32(0x04);
                    args.push(cur_s16(0x02), ptr);
                    // storeFunc(ptr);
                    cmd += 0x08 << CMD_SIZE_SHIFT;
                    break;
                }

                case GeoOpcode.NOP:
                case GeoOpcode.NOP2:
                    cmd += 0x08 << CMD_SIZE_SHIFT;
                    break;

                case GeoOpcode.CopyView:
                    args.push(cur_s16(0x02));
                    cmd += 0x04 << CMD_SIZE_SHIFT;
                    break;

                case GeoOpcode.NodeHeldObj: {
                    const ptr = cur_u32(0x08);
                    // storeFunc(ptr);
                    const { vec } = readVec3s(buffer, cmd + 0x02);
                    args.push(ptr, cur_u8(0x01), vec);
                    cmd += 0x0C << CMD_SIZE_SHIFT;
                    break;
                }

                case GeoOpcode.NodeScale: {
                    const params = cur_u8(0x01);
                    args.push(params, cur_u32(0x04));
                    cmd += 0x08 << CMD_SIZE_SHIFT;
                    if (params & 0x80) {
                        args.push(register(buffer.readUInt32BE(cmd), "GFX"));
                        cmd += 0x04 << CMD_SIZE_SHIFT;
                    }
                    break;
                }

                case GeoOpcode.NOP3:
                    cmd += 0x10 << CMD_SIZE_SHIFT;
                    break;

                case GeoOpcode.NodeCullingRadius:
                    args.push(cur_s16(0x02));
                    cmd += 0x04 << CMD_SIZE_SHIFT;
                    break;

                default:
                    throw new Error(`Unknown geo command ${opcode} at ${cmd}`);
            }

            resource.commands.push({ opcode, args, skip });
        }

        return resource;
    }
}

const register = (offset: number, type: string): bigint => {
    return BigInt(0);
}

const readVec3s = (buffer: Buffer, offset: number): { vec: number[], nextOffset: number } => {
    return {
        vec: [
            buffer.readInt16BE(offset),
            buffer.readInt16BE(offset + 2),
            buffer.readInt16BE(offset + 4)
        ],
        nextOffset: offset + 6
    };
}

export const cur_geo_cmd_u8 = (cmd: Buffer, offset: number): number => {
    return cmd.readUInt8(offset);
};

export const cur_geo_cmd_s16 = (cmd: Buffer, offset: number): number => {
    return cmd.readInt16BE(offset);
};

export const cur_geo_cmd_s32 = (cmd: Buffer, offset: number): number => {
    return cmd.readInt32BE(offset);
};

export const cur_geo_cmd_u32 = (cmd: Buffer, offset: number): number => {
    return cmd.readUInt32BE(offset);
};