// pm2 process for the compiled API. Lives next to the binary on the server.
// One instance only: the live hub and trip state are in memory (spec > What Was Simplified).
module.exports = {
  apps: [
    {
      name: "busapi",
      script: "./busapi",
      cwd: __dirname, // the binary loads .env from here
      interpreter: "none",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      max_memory_restart: "400M",
      kill_timeout: 5000,
      time: true,
    },
  ],
};
