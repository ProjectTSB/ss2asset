type RegisterCommand = { [k in "set" | "append"]: (mes: string, path: string, value: { toString(): string } | undefined, commentOut?: boolean) => string };

export function mkRegisterCommand(storage: string, indent = 4): RegisterCommand {
  return {
    set: (m, p, v, co = false) => [
      `# ${m}`,
      `${" ".repeat(indent)}${co ? "# " : ""}data modify storage ${storage} ${p} set value ${v !== undefined ? v : ""}`
    ].join("\n"),
    append: (m, p, v, co = false) => [
      `# ${m}`,
      `${" ".repeat(indent)}${co ? "# " : ""}data modify storage ${storage} ${p} append value ${v !== undefined ? v : ""}`
    ].join("\n")
  };
}
