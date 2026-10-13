# 1. Create a Private Key and Self-Signed Certificate for the server
openssl req -nodes -new -x509 -keyout server.key -out server.cert -days 365 -subj "/CN=localhost"

# 2. Extract the SHA-256 Public Key Pin Hash (needed for React Native/Client pinning)
openssl x509 -in server.cert -pubkey -noout | openssl rsa -pubin -outform der 2>/dev/null || \
openssl x509 -in server.cert -pubkey -noout | openssl ec -pubin -outform der 2>/dev/null | \
openssl dgst -sha256 -binary | openssl enc -base64:
