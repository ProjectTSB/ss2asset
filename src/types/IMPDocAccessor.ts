import { FileType } from "./FileTypes";

export const ACCESSOR_PRIVATE: AccessorPrivate = { type: "private" };
export interface AccessorPrivate {
    type: "private"
}

export const ACCESSOR_INTERNAL: AccessorInternal = { type: "internal" };
export interface AccessorInternal {
    type: "internal"
}

export interface AccessorWithin {
    type: "within",
    target: { [type in FileType | ""]?: string[] }
}

export const ACCESSOR_PUBLIC: AccessorPublic = { type: "public" };
export interface AccessorPublic {
    type: "public"
}

export const ACCESSOR_API: AccessorApi = { type: "api" };
export interface AccessorApi {
    type: "api"
}

export type IMPDocAccessor = AccessorPrivate | AccessorInternal | AccessorWithin | AccessorPublic | AccessorApi;
