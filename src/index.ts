import path from "path";
import { genIslandRegistry } from "./registers/createIslands";
import { genSpawnerRegistry } from "./registers/createSpawners";
import { genTeleporterRegistry } from "./registers/createTeleporters";

async function run(mode: "island" | "spawner" | "teleporter") {
    const inputPath = path.join(process.cwd(), "input");
    const outputPath = path.join(process.cwd(), "output");
    switch (mode) {
        case "island":
            await genIslandRegistry(inputPath, outputPath);
            break;
        case "spawner":
            await genSpawnerRegistry(inputPath, outputPath);
            break;
        case "teleporter":
            await genTeleporterRegistry(inputPath, outputPath);
            break;
    }
}

run("island");
