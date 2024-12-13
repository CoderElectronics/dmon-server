import * as hashenc from "./hashenc.js"

var ID = "server1";
var N = 10;

const response = await fetch(`http://localhost:3000/api/workers/${ID}/since_n/${N}`, {
  method: "GET",
});

console.log(await response.json());
