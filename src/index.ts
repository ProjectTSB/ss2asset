import { parse as csvParse } from "csv-parse/sync";
import path from "path";
import { makeIMPDoc } from "./minecraft";
import { List } from "./types/List";
import { Vector3D } from "./types/Vector3D";
import { readFile, writeFile } from "./utils";

const getInputPath = (file: string) => path.join(process.cwd(), "input", file);
const getOutputPath = (file: string) => path.join(process.cwd(), "output", file);

function parseCsv<T>(text: string): T {
    return csvParse(text) as T;
}

function mkRegisterCommand(storage: string, indent = 4): {
    set: (mes: string, path: string, value: { toString(): string } | undefined, commentOut?: boolean) => string,
    append: (mes: string, path: string, value: { toString(): string } | undefined, commentOut?: boolean) => string,
} {
    return {
        set: (m, p, v, co = false) => [
            `# ${m}`,
            `${" ".repeat(indent)}${co ? "# " : ""}data modify storage ${storage} ${p} set value ${v !== undefined ? v : ""}`
        ].join("\n"),
        append: (m, p, v, co = false) => [
            `# ${m}`,
            `${" ".repeat(indent)}${co ? "# " : ""}data modify storage ${storage} ${p} append value ${v !== undefined ? v : ""}`
        ].join("\n")
    };
}

async function genIslandRegistry() {
    const register = mkRegisterCommand("asset:island", 4);

    parseCsv<List<string | undefined, 5>[]>(await readFile(getInputPath("island.csv")))
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
            writeFile(getOutputPath(`island/${idStr}/register/.mcfunction`), contentA.join("\n"));

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
            writeFile(getOutputPath(`island/${idStr}/register/register.mcfunction`), contentB.join("\n"));
        });
}

async function genSpawnerRegistry() {
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

    const register = mkRegisterCommand("asset:spawner", 4);

    parseCsv<List<string, 28>[]>(await readFile(getInputPath("spawner.csv")))
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
            writeFile(getOutputPath(`spawner/${idStr}/.mcfunction`), contentA.join("\n"));

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
            writeFile(getOutputPath(`spawner/${idStr}/register.mcfunction`), contentB.join("\n"));
        });
}

async function genTeleporterRegistry() {
    const register = mkRegisterCommand("asset:teleporter", 4);

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

    parseCsv<SpreadsheetColumns[]>(await readFile(getInputPath("teleporter.csv")))
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
            writeFile(getOutputPath(`teleporter/${idStr}/.mcfunction`), contentA.join("\n"));

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
            writeFile(getOutputPath(`teleporter/${idStr}/register.mcfunction`), contentB.join("\n"));
        });
}

async function run(mode: "island" | "spawner" | "teleporter") {
    switch (mode) {
        case "island":
            await genIslandRegistry();
            break;
        case "spawner":
            await genSpawnerRegistry();
            break;
        case "teleporter":
            await genTeleporterRegistry();
            break;
    }
}

run("island");
