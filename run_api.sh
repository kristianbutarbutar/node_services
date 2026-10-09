sudo nohup node dbapi.js > dbapi.log 2>&1 &
sudo nohup node --env-file=.env utilapi.js > utilapi.log 2>&1 &
sudo nohup node --env-file=.env-3002 fileapimulter.js > fileapimulter.log 2>&1 &
sudo nohup node chatapi3031.js > chatapi3031.log 2>&1 &
sudo nohup node chatapi3032.js > chatapi3032.log 2>&1 &
sudo nohup node chatapi3033.js > chatapi3033.log 2>&1 &
sudo nohup node chatloadbalancer.js > chatloadbalancer.log 2>&1 &
sudo nohup node chatwebshocket.js > chatwebshocket.log 2>&1 &
#node voice_bridge.js &
#node token_bridge.js &
