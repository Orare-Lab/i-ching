import { spawn } from "node:child_process";

const processes = [];

function run(name, command, args) {
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
    const { child } = processes.pop();
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  }
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

run("server", "node", ["server/index.js"]);
run("client", "npm", ["run", "dev:client"]);
