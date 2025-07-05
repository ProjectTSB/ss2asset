import path from "path";
import { makeIMPDoc } from "../utils/minecraft";
import { Vector3D } from "../types/Vector3D";
import { readFile, writeFile } from "../utils/io";
import { parseCsv } from "../utils/csv";
import { mkRegisterCommand } from "./common";

type SpreadsheetColumns = [id: string, name: string, difficulty: string, dimension: string, x: string, y: string, z: string, tpCmd: string, tpCmd2: string, pos: string, rotation: string, a: string, b: string, c: string, bossId: string, bossDatapack: string];
interface IslandData {
  id: number,
  name: string,
  dimension: string,
  pos: Vector3D,
  rotation: string,
  bossId: string,
  bossDatapack: string,
}

export async function genIslandRegistry(inputPath: string, outputPath: string) {
  const register = mkRegisterCommand("asset:island", 4);

  parseCsv<SpreadsheetColumns>(await readFile(path.join(inputPath, "island.csv")))
    .slice(1)
    .filter(data => data[1] !== "" && data[10] !== "")
    .map<IslandData>(data => {
      const pos = data[9].trim().split(" ").map(v => parseInt(v.trim(), 10));
      return {
        id: parseInt(data[0], 10),
        name: data[1],
        dimension: `minecraft:${data[3]}`,
        pos: new Vector3D(pos[0], pos[1], pos[2]),
        rotation: data[10],
        bossId: data[14],
        bossDatapack: data[15],
      };
    })
    .forEach(({ id, pos, rotation, bossId, bossDatapack }) => {
      const content: string[] = [
        makeIMPDoc(
          `asset:island/${id}/register`,
          { type: "within", target: { function: [`asset:island/${id}/`] } },
          ["島の定義データ"]
        ),
        "",
        `execute unless loaded ${pos.x} ${pos.y} ${pos.z} run return 1`,
        "",
        register.set("ID (int)", "ID", id),
        register.set("Pos ([int] @ 3)", "Pos", `[${pos.x}, ${pos.y}, ${pos.z}]`),
        register.set("Rotation (string)", "Rotation", `${rotation}f`),
        register.set("BossID (string)", "BossID", bossId, bossId === ""),
        register.set("BossDatapack (string)", "BossDatapack", `"${bossDatapack}"`, bossDatapack === ""),
      ];
      writeFile(path.join(outputPath, `island/${id}/register.mcfunction`), content.join("\n"));
    });
}
