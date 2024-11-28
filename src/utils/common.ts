export function toSnakeCase(str: string): string {
    const preRes = str.replace(/[A-Z]+/g, v => `_${v.toLowerCase()}`);
    if (preRes.indexOf("_") === 0) return preRes.slice(1);
    return preRes;
}

export function isNumeric(str: string): boolean {
    return !Number.isNaN(parseFloat(str));
}

export function getKeys<T extends string>(obj: { [k in T]?: unknown }): T[] {
    return Object.keys(obj) as T[];
}

export function objEntries<T extends string, U>(obj: { [k in T]?: U }): [T, U][] {
    return Object.keys(obj)
        .map(k => [k, obj[k as T]!])
        .filter(v => v[0] !== undefined && v[1] !== undefined) as [T, U][];
}

export function getSafeRecordValue<T extends string | number | symbol, U>(data: Record<T, U[]>, type: T): U[] {
    return data[type] ?? (data[type] = []);
}

export async function setTimeOut(milisec: number): Promise<never> {
    return await new Promise((_, reject) => setTimeout(
        () => reject(new Error("time out")),
        milisec
    ));
}
