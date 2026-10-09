module.exports = {
  apps: [
    {
      name: "voice-bridge",
      script: "voice_bridge.js",
      max_memory_restart: "300M",
      env: { NODE_ENV: "production" }
    }
  ]
};