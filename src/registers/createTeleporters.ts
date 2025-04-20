import path from "path";
import { makeIMPDoc } from "../utils/minecraft";
import { Vector3D } from "../types/Vector3D";
import { readFile, writeFile } from "../utils/io";
import { parseCsv } from "../utils/csv";
import { mkRegisterCommand } from "./common";

type SpreadsheetColumns = [id: string, name: string, dimension: string, x: string, y: string, z: string, activationState: string, colorR: string, colorG: string, colorB: string, groups: string];
interface TeleporterData {
  id: number,
  name: string,
  dimension: string,
  pos: Vector3D,
  activationState: "InvisibleDeactivate" | "VisibleDeactivate" | "Activate",
  color: [number, number, number],
  groups: string[],
}

const activationMap = {
  "起動": "Activate",
  // eslint-disable-next-line @typescript-eslint/naming-convention
  "非起動-可視": "VisibleDeactivate",
  // eslint-disable-next-line @typescript-eslint/naming-convention
  "非起動-非可視": "InvisibleDeactivate"
} as const;

export async function genTeleporterRegistry(inputPath: string, outputPath: string) {
  const register = mkRegisterCommand("asset:teleporter", 4);

  parseCsv<SpreadsheetColumns>(await readFile(path.join(inputPath, "teleporter.csv")))
    .slice(1)
    .filter(data => data[1] !== "")
    .map<TeleporterData>(data => ({
      id: parseInt(data[0], 10),
      name: data[1],
      dimension: `"minecraft:${data[2]}"`,
      pos: new Vector3D(parseInt(data[3], 10), parseInt(data[4], 10), parseInt(data[5], 10)),
      activationState: activationMap[data[6] as keyof typeof activationMap],
      color: [parseInt(data[7], 10), parseInt(data[8], 10), parseInt(data[9], 10)],
      groups: data[10].split(",").map(v => v.trim())
    }))
    .forEach(({ id, dimension, pos, activationState, color, groups }) => {
      const erContent: string[] = [
        makeIMPDoc(
          `asset:teleporter/${id}/early_register`,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          { type: "within", target: { "tag/function": ["asset:teleporter/early_register"] } },
          []
        ),
        "",
        register.append("データ追加", "Teleporters", "{}"),
        register.set("ID (int)", "Teleporters[-1].ID", id),
        register.set("Dimension (string[minecraft:dimension])", "Teleporters[-1].Data.Dimension", dimension),
        register.set("Pos ([int] @ 3)", "Teleporters[-1].Data.Pos", `[${pos.x}, ${pos.y}, ${pos.z}]`),
        register.set("GroupIDs ([string])", "Teleporters[-1].Data.GroupIDs", `[${groups.map(v => `"${v}"`).join(", ")}]`),
        register.set('デフォルトの起動状態 ("InvisibleDeactivate" | "VisibleDeactivate" | "Activate")', "Teleporters[-1].Data.ActivationState", `"${activationState}"`),
        register.set("色 ([int @ 0..255] @ 3)", "Color", `[${color.join(", ")}]`),
        "    function asset:teleporter/common/calculate_and_insert_color_data"
      ];
      writeFile(path.join(outputPath, `teleporter/${id}/early_register.mcfunction`), erContent.join("\n"));

      const content: string[] = [
        makeIMPDoc(
          `asset:teleporter/${id}/register`,
          { type: "within", target: { function: ["asset:teleporter/register/register.m"] } },
          ["テレポーターの定義データ"]
        ),
        "",
        `execute unless loaded ${pos.x} ${pos.y} ${pos.z} run return 1`,
        "",
        register.set("ID (int)", "ID", id),
        register.set("Pos ([int] @ 3)", "Pos", `[${pos.x}, ${pos.y}, ${pos.z}]`),
      ];
      writeFile(path.join(outputPath, `teleporter/${id}/register.mcfunction`), content.join("\n"));
    });
}
