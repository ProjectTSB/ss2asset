import path from "path";
import { makeIMPDoc } from "../minecraft";
import { Vector3D } from "../types/Vector3D";
import { readFile, writeFile } from "../utils";
import { parseCsv } from "../utils/csv";
import { mkRegisterCommand } from "./common";

type SpreadsheetColumns = [id: string, group: string, where: string, dimension: string, x: string, y: string, z: string, activationKind: string, color: string];
interface TeleporterData {
  id: number,
  group: string,
  dimension: string,
  pos: Vector3D,
  activationState: "InvisibleDeactivate" | "VisibleDeactivate" | "Activate",
  color: "white" | "aqua" | undefined
}

const activationMap = {
  "起動": "Activate",
  "非起動-可視": "VisibleDeactivate",
  "非起動-非可視": "InvisibleDeactivate"
} as const;

const colorMap = {
  "白": "white",
  "水色": "aqua"
} as const;

export async function genTeleporterRegistry(inputPath: string, outputPath: string) {
  const register = mkRegisterCommand("asset:teleporter", 4);

  parseCsv<SpreadsheetColumns>(await readFile(path.join(outputPath, "teleporter.csv")))
    .slice(1)
    .filter((data, i) => {
      const isInvalidNumStr = (str: string) => isNaN(parseInt(str));
      if (isInvalidNumStr(data[0])) {
        console.log(`column ${i + 1} / invalid id.`);
        return false;
      }
      if (data[1] === "") {
        console.log(`id: ${data[0]} / invalid group.`);
        return false;
      }
      if (data[3] === "") {
        console.log(`id: ${data[0]} / invalid dimension.`);
        return false;
      }
      if (isInvalidNumStr(data[4]) || isInvalidNumStr(data[5]) || isInvalidNumStr(data[6])) {
        console.log(`id: ${data[0]} / invalid pos.`);
        return false;
      }
      if (activationMap[data[7] as keyof typeof activationMap] === undefined) {
        console.log(`id: ${data[0]} / invalid activation kind.`);
        return false;
      }
      if (colorMap !== undefined && colorMap[data[8] as keyof typeof colorMap] === undefined) {
        console.log(`id: ${data[0]} / invalid color.`);
        return false;
      }
      return true;
    })
    .map<TeleporterData>(data => ({
      id: parseInt(data[0], 10),
      group: data[1],
      dimension: data[3],
      pos: new Vector3D(parseInt(data[4], 10), parseInt(data[5], 10), parseInt(data[6], 10)),
      activationState: activationMap[data[7] as keyof typeof activationMap]!,
      color: colorMap[data[8] as keyof typeof colorMap]
    }))
    .forEach(({ id, group, dimension: dim, pos, activationState, color }) => {
      const idStr = `00${id}`.slice(-3);
      const contentA: string[] = [
        makeIMPDoc(
          `asset:teleporter/${idStr}/`,
          { type: "within", target: { "tag/function": ["asset:teleporter/register"] } },
          ["テレポーターの位置の登録チェック"]
        ),
        `execute unless data storage asset:teleporter DPR[{D:${dim},X:${pos.x},Y:${pos.y},Z:${pos.z}}] in ${dim} positioned ${pos} if entity @p[distance=..40] run function asset:teleporter/${idStr}/register`
      ];
      writeFile(path.join(outputPath, `teleporter/${idStr}/.mcfunction`), contentA.join("\n"));

      const contentB: string[] = [
        makeIMPDoc(
          `asset:teleporter/${idStr}/register`,
          { type: "within", target: { function: [`asset:teleporter/${idStr}/`] } },
          ["スポナーの定義データ"]
        ),
        "",
        register.append("重複防止レジストリへの登録", "DPR", `{D:${dim},X:${pos.x},Y:${pos.y},Z:${pos.z}}`),
        "",
        register.set("ID (int)", "ID", id),
        register.set("GroupID (string)", "GroupID", group),
        register.set('デフォルトの起動状態 ("InvisibleDeactivate" | "VisibleDeactivate" | "Activate")', "ActivationState", activationState),
        register.set('色 ("white" | "aqua")', "Color", color),
        "",
        "function asset:teleporter/common/register"
      ];
      writeFile(path.join(outputPath, `teleporter/${idStr}/register.mcfunction`), contentB.join("\n"));
    });
}
