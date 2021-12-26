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

interface SpawnPotential {
    id: number
    weight?: number
}

interface SpawnerData {
    id: number
    hp: number
    spawnPotentials: SpawnPotential[]
    spawnCount: number
    spawnRange: number
    delay: number
    minSpawnDelay: number
    maxSpawnDelay: number
    maxNearbyEntities: number
    requiredPlayerRange: number
}

async function genSpawnerRegistry() {
    const mkSpawnerData = (data: List<string, 26>): SpawnerData => ({
        id: parseInt(data[0]),
        hp: parseInt(data[18]),
        spawnPotentials: [],
        spawnCount: parseInt(data[19]),
        spawnRange: parseInt(data[20]),
        delay: parseInt(data[21]),
        minSpawnDelay: parseInt(data[22]),
        maxSpawnDelay: parseInt(data[23]),
        maxNearbyEntities: parseInt(data[24]),
        requiredPlayerRange: parseInt(data[25])
    });
    (csvParse(await readFile(getInputPath('spawner.csv'))) as List<string, 26>[])
        .slice(1)
        .map(v => [parseInt(v[1], 10), v[3].split(' ').map(s => parseInt(s, 10)), mkSpawnerData(v)] as [number, Pos, SpawnerData])
        .map(v => v)
}

async function run() {
    // await genIslandRegistry();
    await genSpawnerRegistry();
}

run();