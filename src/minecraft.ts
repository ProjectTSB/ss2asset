import path from 'path';
import { FileType, getFolderNameFromType, getFileType } from './types/FileTypes';
import { AccessorWithin, ACCESSOR_API, IMPDocAccessor } from './types/IMPDocAccessor';
import { objEntries, pathAccessible } from './utils';

export function rcPath2Path(resourcePath: string, fileType: FileType = 'function'): string {
    const m = /^(?:([^:]+):)?(.*)$/.exec(resourcePath);
    if (!m || m.length !== 3) throw Error('Incorrect resourcePath');
    return path.join(m[1], getFolderNameFromType(fileType), `${m[2]}.mcfunction`);
}

export function makeIMPDoc(resourcePath: string, accessor: IMPDocAccessor = ACCESSOR_API, comment: string[] = []): string {
    const mkComplexAccessorStrings = (target: AccessorWithin['target']): string[] => {
        const data = objEntries(target);
        const mkMes = ([t, p]: (typeof data)[number]): string[] => {
            if (p.length === 1)
                return [t && `${t} ` + p];
            else
                return t !== '' ? [t, ...p.map(s => `    ${s}`)] : p;
        };

        if (data.length === 1) {
            const res = mkMes(data[0]);
            return [`@within ${res[0]}`, ...res.slice(1).map(s => s.slice(2))];
        } else {
            return ['@within', ...data.flatMap(v => mkMes(v)).map(s => `  ${s}`)];
        }
    };

    return [
        `> ${resourcePath}`,
        '',
        comment.join('\n\n'),
        '',
        ...accessor.type !== 'within'
            ? [`@${accessor.type}`]
            : mkComplexAccessorStrings(accessor.target)
    ].map(v => `#${v.indexOf('>') !== -1 ? '' : ' '}${v}`).map(s => s.trimEnd()).concat(['']).join('\n');
}

export function getResourcePath(filePath: string, datapackRoot: string, fileType?: FileType): string {
    const fileTypePath = getFolderNameFromType(fileType ?? getFileType(filePath, datapackRoot)) ?? '[^/]+';
    return path.relative(datapackRoot, filePath).replace(/\\/g, '/').replace(RegExp(`^data/([^/]+)/${fileTypePath}/(.*)\\.(?:mcfunction|json)$`), '$1:$2');
}

export function getNamespace(filePath: string, datapackRoot: string): string {
    return path.relative(datapackRoot, filePath).replace(/\\/g, '/').replace(/^data\/([^/]+)\/.*$/, '$1');
}

export async function getDatapackRoot(filePath: string): Promise<string | undefined> {
    if (filePath === path.dirname(filePath))
        return undefined;
    if (await isDatapackRoot(filePath))
        return filePath;
    return getDatapackRoot(path.dirname(filePath));
}

export async function isDatapackRoot(testPath: string): Promise<boolean> {
    return await pathAccessible(path.join(testPath, 'pack.mcmeta')) && await pathAccessible(path.join(testPath, 'data'));
}