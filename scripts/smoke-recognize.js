const http = require("http");
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);
const b = "----bound";
const parts = [];
const add = (s) => parts.push(Buffer.from(s));
add("--" + b + "\r\nContent-Disposition: form-data; name=\"image\"; filename=\"gtr.png\"\r\nContent-Type: image/png\r\n\r\n");
parts.push(png);
add("\r\n--" + b + "\r\nContent-Disposition: form-data; name=\"lat\"\r\n\r\n28.6\r\n--" + b + "\r\nContent-Disposition: form-data; name=\"lng\"\r\n\r\n77.2\r\n--" + b + "--\r\n");
const body = Buffer.concat(parts);
const req = http.request(
  {
    hostname: "localhost",
    port: 3000,
    path: "/api/recognize",
    method: "POST",
    headers: {
      "Content-Type": "multipart/form-data; boundary=" + b,
      "Content-Length": body.length,
    },
  },
  (res) => {
    let d = "";
    res.on("data", (x) => (d += x));
    res.on("end", () => console.log(res.statusCode, d.slice(0, 600)));
  }
);
req.write(body);
req.end();
