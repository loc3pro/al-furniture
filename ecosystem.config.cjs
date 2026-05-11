module.exports = {
  apps: [
    {
      name: "furniture-ecm-web",
      cwd: "/var/www/furniture-ecm/current",
      script: "npm",
      args: "run start -- -p 3000",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "700M",
      kill_timeout: 5000,
      listen_timeout: 10000,
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
    // Bật app này nếu bạn cần chạy worker nền bằng BullMQ/Redis.
    // {
    //   name: "furniture-ecm-worker",
    //   cwd: "/var/www/furniture-ecm/current",
    //   script: "npm",
    //   args: "run worker",
    //   exec_mode: "fork",
    //   instances: 1,
    //   autorestart: true,
    //   watch: false,
    //   max_memory_restart: "512M",
    //   env: {
    //     NODE_ENV: "production",
    //   },
    // },
  ],
};
