import path from "path";
import { makeIMPDoc } from "../utils/minecraft";
import { Vector3D } from "../types/Vector3D";
import { readFile, writeFile } from "../utils/io";
import { parseCsv } from "../utils/csv";
import { mkRegisterCommand } from "./common";

type LootAssets = [id: string, uuid: string, name: string, typ: "fixed" | "random", loot_table: string];
type LootAssetContainers = [id: `${number}`, asset_id: string, world: string, x: string, y: string, z: string, block_id: string, facing: string | "", waterlogged: `${number}` | "", chest_type: string | ""];
type LootAssetItems = [id: string, asset_id: string, slot: string, item: string, quantity: string];

type ItemType = {type:"vanilla", id: string, tag: string | undefined} | {type:"preset", id: string} | {type:"artifact", id: `${number}`};
type Item = (ItemType & { slot: number, quantity: number });

type ChestData = {
  id: number,
  pos: Vector3D,
  block: string
  lootTable?: string | undefined,
  items?: Item[] | undefined,
}

const mkBlock = (data: LootAssetContainers): [pos: Vector3D, blockId: string] => {
  const pos = new Vector3D(parseInt(data[3]), parseInt(data[4]), parseInt(data[5]));
  const facing = data[7] !== "" ? `facing=${data[7].toLowerCase()}` : undefined;
  const waterlogged = (() => {
    switch (data[8]) {
      case "0":
        return "waterlogged=false";
      case "1":
        return "waterlogged=true";
      default:
        return undefined;
    }
  })();
  const chestType = data[9] !== "" ? `type=${data[9].toLowerCase()}` : undefined;
  const block = `"${data[6]}[${[facing, waterlogged, chestType].filter(v => v).join(",")}]"`;
  return [pos, block];
};

export async function genContainerRegistry(inputPath: string, outputPath: string) {
  const register = mkRegisterCommand("asset:container", 4);

  const assets = parseCsv<LootAssets>(await readFile(path.join(inputPath, "loot_assets.csv")));
  const containers = parseCsv<LootAssetContainers>(await readFile(path.join(inputPath, "loot_asset_containers.csv")));
  const items = parseCsv<LootAssetItems>(await readFile(path.join(inputPath, "loot_asset_items.csv")));

  for (const asset of assets) {
    const assetContainers = containers.filter(v => asset[0] === v[1]);
    const assetItems = items.filter(v => asset[0] === v[1]);

    const processedItems = assetItems.map<Item>(v => {
      const slot = parseInt(v[2]);
      const quantity = parseInt(v[4]);

      const resArtifact = /^artifact:(?<id>\d+)$/.exec(v[3]);
      if (resArtifact)
        return { type: "artifact", id: resArtifact.groups?.id as `${number}`, slot, quantity };

      const resPreset = /^preset:(?<id>.+)$/.exec(v[3]);
      if (resPreset)
        return { type: "preset", id: resPreset.groups?.id as string, slot, quantity };

      const resVanilla = /^(?<id>([0-9a-zA-Z_\-.+]+:)?[0-9a-zA-Z_\-.+]+)(?<tag>\{.*\})?$/.exec(v[3]);
      if (resVanilla)
        return { type: "vanilla", id: resVanilla.groups?.id as string, tag: resVanilla.groups?.tag, slot, quantity };

      throw new Error(`Invalid item: ${v[3]}`);
    });

    const chestData: ChestData[] = [];
    if (assetContainers.length === 1) {
      const container = assetContainers[0];
      const id = parseInt(container[0]);
      const [pos, block] = mkBlock(container);
      switch (asset[3]) {
        case "fixed":
          chestData.push({ id, pos, block, items: processedItems });
          break;
        case "random":
          const lootTable = asset[4] !== "" ? asset[4] : undefined;
          chestData.push({ id, pos, block, lootTable });
          break;
      }
    } else if (assetContainers.length === 2) {
      const [container1, container2] = assetContainers;
      const id1 = parseInt(container1[0]);
      const id2 = parseInt(container2[0]);
      const [pos1, block1] = mkBlock(container1);
      const [pos2, block2] = mkBlock(container2);

      switch (asset[3]) {
        case "fixed":
          const [items1, items2] = (() => {
            const l = processedItems.filter(v => v.slot >= 0 && v.slot < 27);
            const r = processedItems.filter(v => v.slot >= 27 && v.slot < 54).map(v => ({ ...v, slot: v.slot - 27 }));
            switch (container1[7]) {
              case "NORTH":
                // X+ が 0..26
                return pos1.x > pos2.x ? [l, r] : [r, l];
              case "SOUTH":
                // X- が 0..26
                return pos1.x < pos2.x ? [l, r] : [r, l];
              case "WEST":
                // Z- が 0..26
                return pos1.z < pos2.z ? [l, r] : [r, l];
              case "EAST":
                // Z+ が 0..26
                return pos1.z > pos2.z ? [l, r] : [r, l];
              default:
                throw new Error(`Invalid facing: ${container1[7]}`);
            }
          })();
          chestData.push({ id: id1, pos: pos1, block: block1, items: items1 });
          chestData.push({ id: id2, pos: pos2, block: block2, items: items2 });
          break;
        case "random":
          const lootTable = asset[4] !== "" ? asset[4] : "empty";
          chestData.push({ id: id1, pos: pos1, block: block1, lootTable });
          chestData.push({ id: id2, pos: pos2, block: block2, lootTable });
          break;
      }
    } else {
      throw new Error(`Invalid asset containers count: ${assetContainers.length} (id: ${asset[0]})`);
    }

    for (const { id, pos, block, lootTable, items } of chestData) {
          const content: string[] = [
            makeIMPDoc(
              `asset:container/${id}/register`,
              { type: "within", target: { function: [`asset:container/${id}/`] } },
              ["コンテナの定義データ"]
            ),
            "",
            `execute unless loaded ${pos.x} ${pos.y} ${pos.z} run return 1`,
            "",
            register.set("ID (int)", "ID", id),
            register.set("Pos ([int] @ 3)", "Pos", `[${pos.x}, ${pos.y}, ${pos.z}]`),
            register.set("ブロック (id(minecraft:block))", "Block", block),
            "",
            "# 以下はどちらかしか設定できない",
            register.set("ルートテーブル (id(minecraft:loot_table)) (オプション)", "LootTable", `"${lootTable}"`, lootTable === undefined),
            register.set(
              "アイテム ([id(minecraft:loot_table)] オプション)", "Items",
              "[" + (items?.map(v => {
              switch (v.type) {
                case "vanilla":
                  const tag = v.tag && v.tag !== "{}" ? `,tag:${v.tag}` : "";
                  return `{Slot:${v.slot}b,Item:{id:"${v.id}",Count:${v.quantity}b${tag}}}`;
                case "preset":
                  return `{Slot:${v.slot}b,Item:{PresetItem:"${v.id}",Count:${v.quantity}b}}`;
                case "artifact":
                  return `{Slot:${v.slot}b,Item:${v.id}}`;
              }
            }).join(",") ?? "") + "]",
            items === undefined
          ),
          ];
          writeFile(path.join(outputPath, `container/${id}/register.mcfunction`), content.join("\n"));
    }
  }
}
