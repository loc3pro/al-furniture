import { spawnSync } from "node:child_process";

/** Xóa SP/đơn/mock liên quan rồi chạy lại prisma/seed.ts (mock đầy đủ). */
spawnSync("npx", ["tsx", "prisma/seed.ts"], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, SEED_RESET: "1" },
});
