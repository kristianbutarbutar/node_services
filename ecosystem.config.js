module.exports = {
  apps: [
    {
      name: "chatapi-3041",
      script: "chatapi3041.js",
      max_memory_restart: "300M",
      env: { NODE_ENV: "production" }
    },
    {
      name: "chatapi-3042",
      script: "chatapi3042.js",
      max_memory_restart: "300M",
      env: { NODE_ENV: "production" }
    },
    {
      name: "loadbalancer",
      script: "loadbalancer.js",
      max_memory_restart: "200M",
      env: { NODE_ENV: "production" }
    },
    {
      name: "chatwebsocket",
      script: "chatwebshocket.js",
      max_memory_restart: "300M",
      env: { NODE_ENV: "production" }
    }
  ]
};