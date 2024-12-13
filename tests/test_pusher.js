import * as hashenc from "./hashenc.js"

var ID = "server1";
var PK = "test_pk_5678";
var IV = "test_iv_1234";

var query = { message: `Hello from Client ${ID}!` };

const response = await fetch(`http://localhost:3000/api/workers/${ID}/push`, {
  method: "POST",
  body: hashenc.encode_query(
    hashenc.generate_hash(PK),
    hashenc.generate_hash(IV, true),
    JSON.stringify(query)
  ),
  headers: { "Content-Type": "application/json" },
});

console.log(await response.json());
