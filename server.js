const express = require("express");
const bodyParser = require("body-parser");
const { Client } = require("amocrm-js");

const config = require("./config");
const token = require("./token.json");

const app = express();
const port = process.env.PORT || 8888;

// Random number to generate ID for new contact
function randomInteger(valuenum) {
  if (valuenum <= 0) {
    throw new Error("Длина числа должна быть больше нуля");
  }

  const min = Math.pow(10, valuenum - 1);
  const max = Math.pow(10, valuenum) - 1;

  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Middleware for JSON parsing
app.use(bodyParser.json());

app.get("/", async (req, res) => {
  res.send("Working");
});

// amocrm client & token

const client = new Client(config);
client.token.setValue(token);

// Function to create a deal with contact data that passes through parameters
async function createDeal(dealId, contactName, contactMail, contactNumber) {
  await client.request.post("/api/v4/leads/complex", [
    {
      name: `Deal №${dealId}`,
      price: 3422,
      _embedded: {
        contacts: [
          {
            first_name: `${contactName}`,
            created_at: 1608905348,
            updated_by: 0,
            custom_fields_values: [
              {
                field_code: "EMAIL",
                values: [
                  {
                    value: `${contactMail}`,
                  },
                ],
              },
              {
                field_code: "PHONE",
                values: [
                  {
                    value: `${contactNumber}`,
                  },
                ],
              },
            ],
          },
        ],
      },
    },
  ]);
}

// if contact doesn't exist, creating new one
async function createContact(name, email, phone) {
  let firstName = name.split(" ")[0];
  let secondName = name.split(" ")[1];
  if (secondName == undefined) secondName = "";

  await client.request.post(`/api/v4/contacts`, [
    {
      first_name: `${firstName}`,
      last_name: `${secondName}`,
      custom_fields_values: [
        {
          field_name: "Телефон",
          field_code: "PHONE",
          field_type: "multitext",
          values: [
            {
              value: phone,
              enum_code: "WORK",
            },
          ],
        },
        {
          field_name: "Email",
          field_code: "EMAIL",
          field_type: "multitext",
          values: [
            {
              value: email,
              enum_code: "WORK",
            },
          ],
        },
      ],
    },
  ]);
}

// if account exists, formatting contained data in it
async function patchContact(name, email, phone, id) {
  await client.request.patch(`/api/v4/contacts/${id}`, {
    id: id,
    name: name,
    custom_fields_values: [
      {
        field_id: 2200295,
        field_name: "Телефон",
        field_code: "PHONE",
        field_type: "multitext",
        values: [
          {
            value: phone,
            enum_code: "WORK",
          },
        ],
      },
      {
        field_id: 2200297,
        field_name: "Email",
        field_code: "EMAIL",
        field_type: "multitext",
        values: [
          {
            value: email,
            enum_code: "WORK",
          },
        ],
      },
    ],
  });
}

// main logic
app.get("/createorupdateClient", async (req, res) => {
  const { name, email, phone } = req.query; // data passed through url
  const dealId = randomInteger(4); // random deal id

  let response = await client.request.get("/api/v4/contacts");
  if (response["data"]["_embedded"] != undefined) {
    // check if there is any registered contact
    let peopleList = response["data"]["_embedded"]["contacts"];

    let accountExists = false;
    let existingAccountValues = [];
    let accountId = "";

    for (let i = 0; i < peopleList.length; i++) {
      if (
        email ==
          peopleList[i]["custom_fields_values"][1]["values"][0]["value"] ||
        phone == peopleList[i]["custom_fields_values"][0]["values"][0]["value"]
      ) {
        accountExists = true; // if account registered we'll take data from it
        accountId = peopleList[i]["id"];
        let user = await client.request.get(`/api/v4/contacts/${accountId}`);
        existingAccountValues.push(
          user["data"]["name"],
          user["data"]["custom_fields_values"][0]["values"][0]["value"],
          user["data"]["custom_fields_values"][1]["values"][0]["value"],
          user["data"]["id"]
        );
        break;
      }
    }

    if (accountExists) {
      if (
        // Data is the same as previous data of contact, there is nothing to change
        existingAccountValues[1] == phone &&
        existingAccountValues[2] == email &&
        existingAccountValues[0] == name
      ) {
        console.log("Account data is the same as existing");
      } else if (
        // formatting data if there is new one
        existingAccountValues[1] == phone ||
        existingAccountValues[2] == email
      ) {
        await patchContact(name, email, phone);
      }
    } else {
      // creating new contact if there is no any with passed data
      await createContact(name, email, phone);
    }
  } else {
    // creating contact if there is no any contact at all
    await createContact(name, email, phone);
  }
  createDeal(dealId, name, email, phone); // creating deal after creating/pathcing contact
});

// staring server
app.listen(port, () => {
  console.log(`Сервер запущен на порту ${port}`);
});
