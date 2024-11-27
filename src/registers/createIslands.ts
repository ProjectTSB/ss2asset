import path from "path";
import { makeIMPDoc } from "../minecraft";
import { List } from "../types/List";
import { Vector3D } from "../types/Vector3D";
import { readFile, writeFile } from "../utils";
import { parseCsv } from "../utils/csv";
import { mkRegisterCommand } from "./common";

export async function genIslandRegistry(inputPath: string, outputPath: string) {
  const register = mkRegisterCommand("asset:island", 4);

  parseCsv<List<string | undefined, 5>[]>(await readFile(path.join(inputPath, "island.csv")))
    .filter(v => v[0] && v[1] && v[2] && v[3])
    .map(v => v.map(v2 => v2?.trim()) as [...List<string, 4>, string?])
    .filter(v => /[0-9]+/.test(v[0]))
    .filter(v => /^[-+]?[0-9]*\.?[0-9]+ [-+]?[0-9]*\.?[0-9]+ [-+]?[0-9]*\.?[0-9]+$/.test(v[2]))
    .map(v => [
      v[0], v[1],
      new Vector3D(...(v[2].split(" ").map(v => parseInt(v, 10)) as List<number, 3>)),
      v[3], v[4]
    ] as [string, string, Vector3D, string, string?])
    .forEach(([id, dim, pos, rot, bossId]) => {
      const idStr = `0${id}`.slice(-2);
      const contentA: string[] = [
        makeIMPDoc(
          `asset:island/${idStr}/register/`,
          { type: "within", target: { "tag/function": ["asset:island/register"] } },
          ["島の呪われた神器のチェック"]
        ),
        `execute unless data storage asset:island DPR[{D:${dim},X:${pos.x},Y:${pos.y},Z:${pos.z}}] in ${dim} positioned ${pos} if entity @p[distance=..40] run function asset:island/${idStr}/register/register`
      ];
      writeFile(path.join(outputPath, `island/${idStr}/register/.mcfunction`), contentA.join("\n"));

      const contentB: string[] = [
        makeIMPDoc(
          `asset:island/${idStr}/register/register`,
          { type: "within", target: { function: [`asset:island/${idStr}/register/`] } },
          ["島の定義データ"]
        ),
        "",
        register.append("重複防止レジストリへの登録", "DPR", `{D:${dim},X:${pos.x},Y:${pos.y},Z:${pos.z}}`),
        "",
        register.set("ID (int)", "ID", id),
        register.set("Rotation (float)", "Rotation", `${rot}f`),
        register.set("BOSS ID (int) (Optional)", "BossID", bossId, !bossId),
        "",
        "function asset:island/common/register"
      ];
      writeFile(path.join(outputPath, `island/${idStr}/register/register.mcfunction`), contentB.join("\n"));
    });
}
