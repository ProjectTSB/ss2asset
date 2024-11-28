import https from "https";
import fs, { promises as fsp } from "fs";
import jschardet from "jschardet";
import iconv from "iconv-lite";
import path from "path";

export async function download(uri: string): Promise<string> {
  return await new Promise((resolve, reject) => {
    https.get(uri, res => {
      let body = "";
      res.on("data", chunk => body += chunk);
      res.on("error", reject);
      res.on("end", () => resolve(body));
    }).end();
  });
}

const encoder = new TextEncoder();
function encode(str: string): Uint8Array {
  return encoder.encode(str);
}

export async function createFile(filePath: string, content: string): Promise<void> {
  if (await pathAccessible(filePath))
    throw new Error(`${filePath}は既に生成されています。`);
  else
    await fsp.writeFile(filePath, encode(content));
}

export async function writeFile(targetPath: string, content: string): Promise<void> {
  await fsp.mkdir(path.dirname(targetPath), { recursive: true });
  return await fsp.writeFile(targetPath, encode(content));
}

export async function readFile(targetPath: string, readSection?: { start: number, end: number }): Promise<string> {
  return await new Promise((resolve, reject) => {
    const data: Buffer[] = [];

    fs.createReadStream(targetPath, { highWaterMark: 256 * 1024, ...readSection })
      .on("data", chunk => data.push(chunk as Buffer))
      .on("end", () => {
        const res = Buffer.concat(data);
        const charCode = jschardet.detect(res).encoding;
        resolve(iconv.decode(res, charCode));
      })
      .on("error", reject);
  });
}

export async function deleteDir(targetPath: string): Promise<void> {
  const stat = await fsp.stat(targetPath);
  if (stat.isFile())
    return await fsp.rm(targetPath);
  if (stat.isDirectory())
    return void Promise.all((await fsp.readdir(targetPath)).map(async v => await deleteDir(path.join(targetPath, v))));
}

export async function recursiveReadDir(targetPath: string): Promise<string[]> {
  const ans: string[] = [];
  for (const file of (await fsp.readdir(targetPath)).map(v => path.join(targetPath, v)))
    ans.push(...(await fsp.stat(file)).isFile() ? [file] : await recursiveReadDir(file));
  return ans;
}

export async function pathAccessible(testPath: string): Promise<boolean> {
  return await fsp.access(testPath)
    .then(() => true)
    .catch(() => false);
}
