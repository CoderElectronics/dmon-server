import * as hashenc from "./hashenc.js"

var ID = "server1";
var N = 10;

const response = await fetch(`http://localhost:3000/api/ui/${ID}/trait_last_n/${N}/sysinfo.cpu.usage_percent`, {
  method: "GET",
});

console.log(await response.text());
