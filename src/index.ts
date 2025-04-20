import path from "path";
import { genIslandRegistry } from "./registers/createIslands";
import { genSpawnerRegistry } from "./registers/createSpawners";
import { genTeleporterRegistry } from "./registers/createTeleporters";
import { genContainerRegistry } from "./registers/createContainers";
import { pathAccessible, recursiveReadDir } from "./utils/io";

async function run(mode: "island" | "spawner" | "teleporter" | "container") {
    const inputPath = path.join(process.cwd(), "input");
    const outputPath = path.join(process.cwd(), "output");
    switch (mode) {
        case "island":
            if (await pathAccessible(path.join(inputPath, "island"))) await recursiveReadDir(path.join(inputPath, "island"));
            await genIslandRegistry(inputPath, outputPath);
            break;
        case "spawner":
            if (await pathAccessible(path.join(inputPath, "spawner"))) await recursiveReadDir(path.join(inputPath, "spawner"));
            await genSpawnerRegistry(inputPath, outputPath);
            break;
        case "teleporter":
            if (await pathAccessible(path.join(inputPath, "teleporter"))) await recursiveReadDir(path.join(inputPath, "teleporter"));
            await genTeleporterRegistry(inputPath, outputPath);
            break;
        case "container":
            if (await pathAccessible(path.join(inputPath, "container"))) await recursiveReadDir(path.join(inputPath, "container"));
            await genContainerRegistry(inputPath, outputPath);
            break;
    }
}

run("island");
run("spawner");
run("teleporter");
run("container");
