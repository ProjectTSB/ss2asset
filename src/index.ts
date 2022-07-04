import { parse as csvParse } from 'csv-parse/sync';
import path from 'path';
import { makeIMPDoc } from './minecraft';
import { List } from './types/List';
import { readFile, toSnakeCase, writeFile } from './utils';

const getInputPath = (file: string) => path.join(process.cwd(), 'input', file);
const getOutputPath = (file: string) => path.join(process.cwd(), 'output', file);

function parseCsv<T>(text: string): T {
    return csvParse(text) as T;
}

function mkRegisterCommand(storage: string, indent = 4): (
    (mes: string, path: string, value: { toString(): string } | undefined, commentOut?: boolean) => string
) {
    return (m, p, v, co = false) => [
        `# ${m}`,
        `${' '.repeat(indent)}${co ? '# ' : ''}data modify storage ${storage} ${p} set value ${v !== undefined ? v : ''}`
    ].join('\n');
}

async function genIslandRegistry() {
    const register = mkRegisterCommand('asset:island', 4);

    const mobMap = parseCsv<[number, string][]>(await readFile(getInputPath('mob.csv')));

    parseCsv<List<string | undefined, 5>[]>(await readFile(getInputPath('island.csv')))
        .filter(v => v[0] && v[1] && v[2] && v[3])
        .map(v => v.map(v2 => v2?.trim()) as [...List<string, 4>, string?])
        .filter(v => /[0-9]+/.test(v[0]))
        .filter(v => /^[-+]?[0-9]*\.?[0-9]+ [-+]?[0-9]*\.?[0-9]+ [-+]?[0-9]*\.?[0-9]+$/.test(v[2]))
        .map(([id, dim, pos, rot, bossName]) => [
            id, dim, pos, rot,
            bossName ? mobMap.find(v => v[1] === bossName)?.[0] : undefined
        ] as [...List<string, 4>, number?])
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
                register('ID (int)', 'ID', id),
                register('Rotation (float)', 'Rotation', `${rot}f`),
                register('BOSS ID (int) (Optional)', 'BossID', bossId, !!bossId),
                '',
                'function asset:island/common/register'
            ];
            writeFile(getOutputPath(`island/${idStr}/register/register.mcfunction`), contentB.join('\n'));
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
        const h = [[data[8], data[10]], [data[11], data[13]], [data[14], data[16]], [data[17], data[19]]].filter(v => v[0] !== '');
        return (h.every(v => v[1] === ''))
            ? h.map(v => parseInt(v[0]))
            // eslint-disable-next-line @typescript-eslint/naming-convention
            : h.map(v => ({ Id: parseInt(v[0]), Weight: parseInt(v[1] || '1') }));
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

    const register = mkRegisterCommand('asset:spawner', 4);

    parseCsv<List<string, 28>[]>(await readFile(getInputPath('spawner.csv')))
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
                register('ID (int)', 'ID', id),
                register('体力 (int) このスポナーから召喚されたMobがN体殺されると破壊されるか', 'HP', data.hp),
                register('SpawnPotentials(int | int[] | ({ Weight: int, Id: int })[]) MobAssetのIDを指定する',
                    'SpawnPotentials', JSON.stringify(data.spawnPotentials).replace(/"/g, '')),
                register('一度に召喚する数 (int)', 'SpawnCount', data.spawnCount),
                register('動作範囲 (int) この範囲にプレイヤーが存在するとき、Mobの召喚を開始する',
                    'SpawnRange', data.spawnRange),
                register('初回召喚時間 (int)', 'Delay', data.delay),
                register('最低召喚間隔 (int)', 'MinSpawnDelay', data.minSpawnDelay),
                register('最大召喚間隔 (int)', 'MaxSpawnDelay', data.maxSpawnDelay),
                register('近くのエンティティの最大数 (int)', 'MaxNearbyEntities', data.maxNearbyEntities),
                register('この範囲にプレイヤーが存在するとき、Mobの召喚を開始する // distance <= 100',
                    'RequiredPlayerRange', data.requiredPlayerRange),
                '',
                'function asset:spawner/common/register'
            ];
            writeFile(getOutputPath(`spawner/${idStr}/register.mcfunction`), contentB.join('\n'));
        });
}

async function run() {
    // await genIslandRegistry();
    // await genSpawnerRegistry();
}

run();