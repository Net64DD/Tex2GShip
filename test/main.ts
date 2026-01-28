import fs from "fs";
import { BinaryWriter } from "../src/util/bwriter";
import { ResourceFactory } from "../src/factory/resource";
import DynosFactory from "../src/factory/list/dynos";

async function main() {
    const writer = new BinaryWriter();

    const buffer = fs.readFileSync('./mario_geo.bin');
    await ResourceFactory.process(DynosFactory, buffer, {});

    // await instance.export(writer, result);

    console.log(writer.toBuffer());
}

main();