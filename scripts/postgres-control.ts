import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolve, basename } from "node:path";
const exec = promisify(execFile);
// Native pg_ctl avoids Windows process-tree shutdown races in the embedded wrapper.
export async function controlPostgres(
  directory: string,
  port: number,
  action: "start" | "stop",
) {
  const platform = process.platform === "win32" ? "windows" : process.platform;
  const binaries = (await import(
    `@embedded-postgres/${platform}-${process.arch}`
  )) as { pg_ctl: string };
  const args = ["-D", resolve(directory), "-w", "-t", "30"];
  if (action === "start")
    args.push(
      "-l",
      resolve(directory, "..", `${basename(directory)}.log`),
      "-o",
      `-h 127.0.0.1 -p ${port}`,
      "start",
    );
  else args.push("-m", "fast", "stop");
  await exec(binaries.pg_ctl, args, { windowsHide: true, timeout: 35_000 });
}
