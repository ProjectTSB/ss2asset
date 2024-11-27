/* eslint-disable @typescript-eslint/naming-convention */
import * as path from "path";
import { minimatch } from "minimatch";

export type FileType =
    | "advancement"
    | "dimension"
    | "dimension_type"
    | "function"
    | "loot_table"
    | "predicate"
    | "recipe"
    | "structure"
    | "tag/block"
    | "tag/entity_type"
    | "tag/fluid"
    | "tag/function"
    | "tag/item"
    | "worldgen/biome"
    | "worldgen/configured_carver"
    | "worldgen/configured_decorator"
    | "worldgen/configured_feature"
    | "worldgen/configured_structure_feature"
    | "worldgen/configured_surface_builder"
    | "worldgen/noise_settings"
    | "worldgen/processor_list"
    | "worldgen/template_pool";

export const fileTypeFolderName: { [key in FileType]: string } = {
    // common
    advancement: "advancements",
    dimension: "dimension",
    dimension_type: "dimension_type",
    function: "functions",
    loot_table: "loot_tables",
    predicate: "predicates",
    recipe: "recipes",
    structure: "structures",
    // tag
    "tag/block": "tags/blocks",
    "tag/entity_type": "tags/entity_types",
    "tag/fluid": "tags/fluids",
    "tag/function": "tags/functions",
    "tag/item": "tags/items",
    // worldgen
    "worldgen/biome": "worldgen/biome",
    "worldgen/configured_carver": "worldgen/configured_carver",
    "worldgen/configured_decorator": "worldgen/configured_decorator",
    "worldgen/configured_feature": "worldgen/configured_feature",
    "worldgen/configured_structure_feature": "worldgen/configured_structure_feature",
    "worldgen/configured_surface_builder": "worldgen/configured_surface_builder",
    "worldgen/noise_settings": "worldgen/noise_settings",
    "worldgen/processor_list": "worldgen/processor_list",
    "worldgen/template_pool": "worldgen/template_pool"
};

export const fileTypePaths: Record<FileType, string> = {
    // common
    advancement: "data/*/advancements/**",
    dimension: "data/*/dimension/**",
    dimension_type: "data/*/dimension_type/**",
    function: "data/*/functions/**",
    loot_table: "data/*/loot_tables/**",
    predicate: "data/*/predicates/**",
    recipe: "data/*/recipes/**",
    structure: "data/*/structures/**/*.nbt",
    // tag
    "tag/block": "data/*/tags/blocks/**",
    "tag/entity_type": "data/*/tags/entity_types/**",
    "tag/fluid": "data/*/tags/fluids/**",
    "tag/function": "data/*/tags/functions/**",
    "tag/item": "data/*/tags/items/**",
    // worldgen
    "worldgen/biome": "data/*/worldgen/biome/**",
    "worldgen/configured_carver": "data/*/worldgen/configured_carver/**",
    "worldgen/configured_decorator": "data/*/worldgen/configured_decorator/**",
    "worldgen/configured_feature": "data/*/worldgen/configured_feature/**",
    "worldgen/configured_structure_feature": "data/*/worldgen/configured_structure_feature/**",
    "worldgen/configured_surface_builder": "data/*/worldgen/configured_surface_builder/**",
    "worldgen/noise_settings": "data/*/worldgen/noise_settings/**",
    "worldgen/processor_list": "data/*/worldgen/processor_list/**",
    "worldgen/template_pool": "data/*/worldgen/template_pool/**"
};

/**
 * ファイルの種類を取得します
 * @param filePath 取得したいファイルのファイルパス
 * @param datapackRoot データパックのルートパス
 */
export function getFileType(filePath: string, datapackRoot: string): FileType | undefined {
    const dir = path.relative(datapackRoot, filePath).replace(/(\\|$)/g, "/");
    for (const type of Object.keys(fileTypePaths) as FileType[]) {
        if (minimatch(dir, fileTypePaths[type]))
            return type;
    }
    return undefined;
}

export function getFolderNameFromType(fileType: FileType): string;
export function getFolderNameFromType(fileType: undefined): undefined;
export function getFolderNameFromType(fileType: FileType | undefined): string | undefined;
export function getFolderNameFromType(fileType: FileType | undefined): string | undefined {
    if (!fileType) return undefined;
    return fileTypeFolderName[fileType];
}
