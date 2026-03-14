import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { logoutHandler, meHandler, redeemInviteHandler } from "./authHandlers";
import interpretHandler from "./interpretHandler";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const distDir = path.join(projectRoot, "dist");

const app = express();
const port = Number(process.env.PORT || 3001);

app.use(express.json({ limit: "1mb" }));

app.get("/api/me", meHandler);
app.post("/api/redeem-invite", redeemInviteHandler);
app.post("/api/logout", logoutHandler);
app.all("/api/interpret", interpretHandler);

if (process.env.NODE_ENV === "production") {
  app.use(express.static(distDir));

  app.get("*", (_req: unknown, res: { sendFile: (filePath: string) => void }) => {
    res.sendFile(path.join(distDir, "index.html"));
  });
}

app.listen(port, () => {
  console.log(`I Ching server listening on http://localhost:${port}`);
});
