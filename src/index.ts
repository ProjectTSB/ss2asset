import { parse as csvParse } from 'csv-parse/sync';
import path from 'path';
import { makeIMPDoc } from './minecraft';
import { List } from './types/List';
import { readFile, writeFile } from './utils';

const getInputPath = (file: string) => path.join(process.cwd(), 'input', file);
const getOutputPath = (file: string) => path.join(process.cwd(), 'output', file);

type Pos = [number, number, number];

async function genIslandRegistry() {
    const mobMap = (await readFile(getInputPath('mob.txt')))
        .split(/\r?\n/)
        .map(line => line.split('\t'))
        .map(([idStr, name]) => [parseInt(idStr), name] as [id: number, name: string]);
    (await readFile(getInputPath('data.txt')))
        .split(/\r?\n/)
        .map(line => line.split('\t') as [string?, string?, string?])
        .filter(v => v[0] && v[1])
        .map(v => v as [string, string, string?])
        .filter(v => /[0-9]+/.test(v[0]))
        .filter(v => /^[-+]?[0-9]*\.?[0-9]+ [-+]?[0-9]*\.?[0-9]+ [-+]?[0-9]*\.?[0-9]+$/.test(v[1]))
        .map(([idStr, posStr, bossName]) => [parseInt(idStr, 10), posStr, bossName] as [number, string, string?])
        .map(([id, posStr, bossName]) => [id, posStr.split(' ').map(p => parseInt(p, 10)) as Pos, bossName] as [number, Pos, string?])
        .map(([id, pos, bossName]) => [id, pos, bossName ? mobMap.find(v => v[1] === bossName)?.[0] : undefined] as [number, Pos, number?])
        .forEach(([id, pos, bossId]) => {
            const contentA: string[] = [
                makeIMPDoc(
                    `asset:island/${id}/register/`,
                    { type: 'within', target: { 'tag/function': ['asset:island/register'] } },
                    ['島の呪われた神器の位置を書く']
                ),
                `execute positioned ${pos.join(' ')} unless entity @e[type=armor_stand,tag=CursedTreasure,distance=..0.001] run function asset:island/${id}/register/register`
            ];
            writeFile(getOutputPath(`island/${id}/register/.mcfunction`), contentA.join('\n'));

            const contentB: string[] = [
                makeIMPDoc(
                    `asset:island/${id}/register/register`,
                    { type: 'within', target: { function: [`asset:island/${id}/register/`] } },
                    ['島の定義データ']
                ),
                '',
                '# ID (int)',
                `    data modify storage asset:island ID set value ${id}`,
                '# Rotation (float) (Optional)',
                '    data modify storage asset:island Rotation set value 0.0f',
                '# BOSS ID (int) (Optional)',
                bossId
                    ? `    data modify storage asset:island BossID set value ${bossId}`
                    : '    # data modify storage asset:island BossID set value ',
                '',
                'function asset:island/common/register'
            ];
            writeFile(getOutputPath(`island/${id}/register/register.mcfunction`), contentB.join('\n'));
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
    const mkSpawnPotentials = (data: List<string, 27>): SpawnPotentials => {
        const h = [[data[7], data[9]], [data[10], data[12]], [data[13], data[15]], [data[16], data[18]]].filter(v => v[0] !== '');
        return (h.every(v => v[1] === ''))
            ? h.map(v => parseInt(v[0]))
            // eslint-disable-next-line @typescript-eslint/naming-convention
            : h.map(v => ({ Id: parseInt(v[0]), Weight: parseInt(v[1] || '1') }));
    };
    const mkSpawnerData = (data: List<string, 27>): SpawnerData => ({
        id: parseInt(data[0]),
        hp: parseInt(data[19]),
        spawnPotentials: mkSpawnPotentials(data),
        spawnCount: parseInt(data[20]),
        spawnRange: parseInt(data[21]),
        delay: parseInt(data[22]),
        minSpawnDelay: parseInt(data[23]),
        maxSpawnDelay: parseInt(data[24]),
        maxNearbyEntities: parseInt(data[25]),
        requiredPlayerRange: parseInt(data[26])
    });
    (csvParse(await readFile(getInputPath('spawner.csv'))) as List<string, 27>[])
        .slice(1)
        .filter(v => v[4] !== '')
        .map(v => [parseInt(v[0], 10), v[4].split(' ').map(s => parseInt(s, 10)), mkSpawnerData(v)] as [number, Pos, SpawnerData])
        .forEach(([id, pos, data]) => {
            const idStr = `00${id}`.slice(-3);
            const contentA: string[] = [
                makeIMPDoc(
                    `asset:spawner/${idStr}/`,
                    { type: 'within', target: { 'tag/function': ['asset:spawner/register'] } },
                    ['スポナーの呪われた神器の位置を書く']
                ),
                `execute positioned ${pos.join(' ')} unless entity @e[type=armor_stand,tag=Spawner,distance=..0.001] run function asset:spawner/${idStr}/register`
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
    // await genIslandRegistry();
    await genSpawnerRegistry();
}

run();