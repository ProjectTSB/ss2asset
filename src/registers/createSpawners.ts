import path from "path";
import { makeIMPDoc } from "../utils/minecraft";
import { List } from "../types/List";
import { Vector3D } from "../types/Vector3D";
import { readFile, writeFile } from "../utils/io";
import { parseCsv } from "../utils/csv";
import { mkRegisterCommand } from "./common";

// eslint-disable-next-line @typescript-eslint/naming-convention
type SpawnPotentials = number | { Id: number, Weight?: number }[] | number[];

interface SpawnerData {
  id: number
  hp: number
  spawnPotentials: SpawnPotentials
  spawnCount: number
  spawnRange: number
  delay: number
  minSpawnDelay: number
  maxSpawnDelay: number
  maxNearbyEntities: number
  requiredPlayerRange: number
}

const mkSpawnPotentials = (data: List<string, 28>): SpawnPotentials => {
  const h = [[data[8], data[10]], [data[11], data[13]], [data[14], data[16]], [data[17], data[19]]].filter(v => v[0] !== "");
  return (h.every(v => v[1] === ""))
    ? h.map(v => parseInt(v[0]))
    // eslint-disable-next-line @typescript-eslint/naming-convention
    : h.map(v => ({ Id: parseInt(v[0]), Weight: parseInt(v[1] || "1") }));
};
const mkSpawnerData = (data: List<string, 28>): SpawnerData => ({
  id: parseInt(data[0], 10),
  hp: parseInt(data[20], 10),
  spawnPotentials: mkSpawnPotentials(data),
  spawnCount: parseInt(data[21], 10),
  spawnRange: parseInt(data[22], 10),
  delay: parseInt(data[23], 10),
  minSpawnDelay: parseInt(data[24], 10),
  maxSpawnDelay: parseInt(data[25], 10),
  maxNearbyEntities: parseInt(data[26], 10),
  requiredPlayerRange: parseInt(data[27], 10)
});

export async function genSpawnerRegistry(inputPath: string, outputPath: string) {
  const register = mkRegisterCommand("asset:spawner", 4);

  parseCsv<List<string, 28>>(await readFile(path.join(inputPath, "spawner.csv")))
    .slice(1)
    .filter(v => v[5] !== "")
    .map(v => [
      parseInt(v[0], 10), v[4].trim(),
      new Vector3D(...(v[5].trim().split(" ").map(v => parseInt(v, 10)) as List<number, 3>)),
      mkSpawnerData(v)
    ] as [number, string, Vector3D, SpawnerData])
    .forEach(([id, dim, pos, data]) => {
      const idStr = `00${id}`.slice(-3);
      const contentA: string[] = [
        makeIMPDoc(
          `asset:spawner/${idStr}/`,
          { type: "within", target: { "tag/function": ["asset:spawner/register"] } },
          ["スポナーのチェック"]
        ),
        `execute unless data storage asset:spawner DPR[{D:${dim},X:${pos.x},Y:${pos.y},Z:${pos.z}}] in ${dim} positioned ${pos} if entity @p[distance=..40] run function asset:spawner/${idStr}/register`
      ];
      writeFile(path.join(outputPath, `spawner/${idStr}/.mcfunction`), contentA.join("\n"));

      const contentB: string[] = [
        makeIMPDoc(
          `asset:spawner/${idStr}/register`,
          { type: "within", target: { function: [`asset:spawner/${idStr}/`] } },
          ["スポナーの定義データ"]
        ),
        "",
        register.append("重複防止レジストリへの登録", "DPR", `{D:${dim},X:${pos.x},Y:${pos.y},Z:${pos.z}}`),
        "",
        register.set("ID (int)", "ID", id),
        register.set("体力 (int) このスポナーから召喚されたMobがN体殺されると破壊されるか", "HP", data.hp),
        register.set("SpawnPotentials(int | int[] | ({ Weight: int, Id: int })[]) MobAssetのIDを指定する",
          "SpawnPotentials", JSON.stringify(data.spawnPotentials).replace(/"/g, "")),
        register.set("一度に召喚する数 (int)", "SpawnCount", data.spawnCount),
        register.set("動作範囲 (int) この範囲にプレイヤーが存在するとき、Mobの召喚を開始する",
          "SpawnRange", data.spawnRange),
        register.set("初回召喚時間 (int)", "Delay", data.delay),
        register.set("最低召喚間隔 (int)", "MinSpawnDelay", data.minSpawnDelay),
        register.set("最大召喚間隔 (int)", "MaxSpawnDelay", data.maxSpawnDelay),
        register.set("近くのエンティティの最大数 (int)", "MaxNearbyEntities", data.maxNearbyEntities),
        register.set("この範囲にプレイヤーが存在するとき、Mobの召喚を開始する // distance <= 100",
          "RequiredPlayerRange", data.requiredPlayerRange),
        "",
        "function asset:spawner/common/register"
      ];
      writeFile(path.join(outputPath, `spawner/${idStr}/register.mcfunction`), contentB.join("\n"));
    });
}
