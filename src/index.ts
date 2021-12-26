import { parse as csvParse } from 'csv-parse/sync';
import path from 'path';
import { makeIMPDoc } from './minecraft';
import { List } from './types/List';
import { readFile, toSnakeCase, writeFile } from './utils';

const getInputPath = (file: string) => path.join(process.cwd(), 'input', file);
const getOutputPath = (file: string) => path.join(process.cwd(), 'output', file);

async function genIslandRegistry() {
    const mobMap = csvParse(await readFile(getInputPath('mob.csv'))) as [id: number, name: string][];
    (csvParse(await readFile(getInputPath('island.csv'))) as [string?, string?, string?, string?, string?][])
        .filter(v => v[0] && v[1] && v[2] && v[3])
        .map(v => v as [string, string, string, string, string?])
        .filter(v => /[0-9]+/.test(v[0]))
        .filter(v => /^[-+]?[0-9]*\.?[0-9]+ [-+]?[0-9]*\.?[0-9]+ [-+]?[0-9]*\.?[0-9]+$/.test(v[2]))
        .map(([id, dim, pos, rot, bossName]) => [
            id.trim(),
            dim.trim(),
            pos.trim(),
            rot.trim(),
            bossName ? mobMap.find(v => v[1] === bossName)?.[0] : undefined
        ] as [string, string, string, string, number?])
        .forEach(([id, dim, pos, rot, bossId]) => {
            const idStr = `0${id}`.slice(-2);
            const contentA: string[] = [
                makeIMPDoc(
                    `asset:island/${idStr}/register/`,
                    { type: 'within', target: { 'tag/function': ['asset:island/register'] } },
                    ['島の呪われた神器の位置を書く']
                ),
                `execute in ${toSnakeCase(dim)} positioned ${pos} unless entity @e[type=armor_stand,tag=CursedTreasure,distance=..0.001] run function asset:island/${idStr}/register/register`
            ];
            writeFile(getOutputPath(`island/${idStr}/register/.mcfunction`), contentA.join('\n'));

            const contentB: string[] = [
                makeIMPDoc(
                    `asset:island/${idStr}/register/register`,
                    { type: 'within', target: { function: [`asset:island/${idStr}/register/`] } },
                    ['島の定義データ']
                ),
                '',
                '# ID (int)',
                `    data modify storage asset:island ID set value ${id}`,
                '# Rotation (float)',
                `    data modify storage asset:island Rotation set value ${rot}f`,
                '# BOSS ID (int) (Optional)',
                bossId
                    ? `    data modify storage asset:island BossID set value ${bossId}`
                    : '    # data modify storage asset:island BossID set value ',
                '',
                'function asset:island/common/register'
            ];
            writeFile(getOutputPath(`island/${idStr}/register/register.mcfunction`), contentB.join('\n'));
        });
}

// eslint-disable-next-line @typescript-eslint/naming-convention
type SpawnPotentials = number| { Id: number, Weight?: number }[] | number[];

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

async function genSpawnerRegistry() {
    const mkSpawnPotentials = (data: List<string, 28>): SpawnPotentials => {
        const h = [[data[8], data[10]], [data[11], data[13]], [data[14], data[16]], [data[17], data[19]]].filter(v => v[0] !== '');
        return (h.every(v => v[1] === ''))
            ? h.map(v => parseInt(v[0]))
            // eslint-disable-next-line @typescript-eslint/naming-convention
            : h.map(v => ({ Id: parseInt(v[0]), Weight: parseInt(v[1] || '1') }));
    };
    const mkSpawnerData = (data: List<string, 28>): SpawnerData => ({
        id: parseInt(data[0]),
        hp: parseInt(data[20]),
        spawnPotentials: mkSpawnPotentials(data),
        spawnCount: parseInt(data[21]),
        spawnRange: parseInt(data[22]),
        delay: parseInt(data[23]),
        minSpawnDelay: parseInt(data[24]),
        maxSpawnDelay: parseInt(data[25]),
        maxNearbyEntities: parseInt(data[26]),
        requiredPlayerRange: parseInt(data[27])
    });
    (csvParse(await readFile(getInputPath('spawner.csv'))) as List<string, 28>[])
        .slice(1)
        .filter(v => v[5] !== '')
        .map(v => [parseInt(v[0], 10), v[4].trim(), v[5].trim(), mkSpawnerData(v)] as [number, string, string, SpawnerData])
        .forEach(([id, dim, pos, data]) => {
            const idStr = `00${id}`.slice(-3);
            const contentA: string[] = [
                makeIMPDoc(
                    `asset:spawner/${idStr}/`,
                    { type: 'within', target: { 'tag/function': ['asset:spawner/register'] } },
                    ['スポナーの呪われた神器の位置を書く']
                ),
                `execute in ${dim} positioned ${pos} unless block ~ ~ ~ barrier unless entity @e[type=snowball,tag=Spawner,distance=..0.41] run function asset:spawner/${idStr}/register`
            ];
            writeFile(getOutputPath(`spawner/${idStr}/.mcfunction`), contentA.join('\n'));

            const contentB: string[] = [
                makeIMPDoc(
                    `asset:spawner/${idStr}/register`,
                    { type: 'within', target: { function: [`asset:spawner/${idStr}/`] } },
                    ['スポナーの定義データ']
                ),
                '',
                '# ID (int)',
                `    data modify storage asset:spawner ID set value ${id}`,
                '# 体力 (int) このスポナーから召喚されたMobがN体殺されると破壊されるか',
                `    data modify storage asset:spawner HP set value ${data.hp}`,
                '# SpawnPotentials(int | int[] | ({ Weight: int, Id: int })[]) MobAssetのIDを指定する',
                `    data modify storage asset:spawner SpawnPotentials set value ${JSON.stringify(data.spawnPotentials).replace(/"/g, '')}`,
                '# 一度に召喚する数 (int)',
                `    data modify storage asset:spawner SpawnCount set value ${data.spawnCount}`,
                '# 動作範囲 (int) この範囲にプレイヤーが存在するとき、Mobの召喚を開始する',
                `    data modify storage asset:spawner SpawnRange set value ${data.spawnRange}`,
                '# 初回召喚時間 (int)',
                `    data modify storage asset:spawner Delay set value ${data.delay}`,
                '# 最低召喚間隔 (int)',
                `    data modify storage asset:spawner MinSpawnDelay set value ${data.minSpawnDelay}`,
                '# 最大召喚間隔 (int)',
                `    data modify storage asset:spawner MaxSpawnDelay set value ${data.maxSpawnDelay}`,
                '# 近くのエンティティの最大数 (int)',
                `    data modify storage asset:spawner MaxNearbyEntities set value ${data.maxNearbyEntities}`,
                '# この範囲にプレイヤーが存在するとき、Mobの召喚を開始する // distance <= 100',
                `    data modify storage asset:spawner RequiredPlayerRange set value ${data.requiredPlayerRange}`,
                '',
                'function asset:spawner/common/register'
            ];
            writeFile(getOutputPath(`spawner/${idStr}/register.mcfunction`), contentB.join('\n'));
        });
}

async function run() {
    await genIslandRegistry();
    // await genSpawnerRegistry();
}

run();