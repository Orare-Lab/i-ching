import { spawn, type ChildProcess } from "node:child_process";

const processes: Array<{ name: string; child: ChildProcess }> = [];

function run(name: string, command: string, args: string[]) {
  const child = spawn(command, args, {
    stdio: "inherit",
    env: process.env,
  });

  child.on("exit", (code) => {
    if (code !== 0) {
      process.exitCode = code ?? 1;
    }
    shutdown();
  });

  processes.push({ name, child });
}

function shutdown() {
  while (processes.length > 0) {
    const processEntry = processes.pop();
    if (!processEntry) {
      continue;
    }

    if (!processEntry.child.killed) {
      processEntry.child.kill("SIGTERM");
    }
  }
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

run("server", "npm", ["run", "dev:server"]);
run("client", "npm", ["run", "dev:client"]);
