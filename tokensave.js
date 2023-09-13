const path = require("path");
const fs = require("fs");

const { Client } = require("amocrm-js");
const config = require("./config");

const client = new Client(config);
const filePath = path.resolve(__dirname, "token.json");

// Getting token and save it in json file

(async () => {
  client.token.on("change", () => {
    const token = client.token.getValue();
    fs.writeFileSync(filePath, JSON.stringify(token));
  });

  await client.connection.connect();
})();
