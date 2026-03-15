const https = require("https");
const options = {
    hostname: "cl4.jinc-jodhpur.com",
    port: 443,
    method: "GET",
    minVersion: "TLSv1.3"// Force TLS 1.3 (or use "TLSv1_2_method" for TLS 1.2)
};
const req = https.request(options, (res) => {
    console.log("Connected with TLS:", res.socket.getProtocol());
    console.log("Cipher Suite:", res.socket.getCipher());
    res.on("data", (d) => process.stdout.write(d));
});
req.on("error", (e) => {
    console.error("Error:", e);
});
req.end();






