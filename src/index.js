import { Hono } from 'hono'
import { Database } from "bun:sqlite";

import * as db from "./db.js"
import * as hashenc from "./hashenc.js"
import * as ppath from "./propertypath.js"
import config from "./config.js"

/* initialize all */
var cfg = config();
var app = new Hono()

db.initialize(cfg.server.db ?? "dmon_state.db");

/* routes */
function route_msg(type, msg) {
  console.log(`${Bun.color("green", "ansi")}[${type}]${Bun.color("white", "ansi")} ${msg}`);
}

app.get('/', (c) => {
  route_msg("home", `home page request made`);
  return c.text('Home page is here!')
});

app.get('/api/workers/:id/last_n/:n', async (c) => {
  /*
    Retrieve the last n events from the database
    @param id: the id of the worker
    @param n: the number of events to retrieve
  */
  const { id, n } = c.req.param();

  route_msg(id, `last_n request made, n: ${n}`);

  const query = db.retrieve_latest_n(id, n);
  return c.json({ status: "success", payload: query }, 200, {});
});

app.get('/api/workers/:id/since_n/:n', async (c) => {
  /*
    Retrieve all events since the n seconds ago
    @param id: the id of the worker
    @param n: the number of seconds ago
  */
  const { id, n } = c.req.param();

  route_msg(id, `since_n request made, n: ${n}`);

  const query = db.retrieve_since_n(id, n);
  return c.json({ status: "success", payload: query }, 200, {});
});

app.get('/api/workers/:id/trait_since_n/:n/:trait', async (c) => {
  /*
    Retrieve trait from all events since the n seconds ago
    @param id: the id of the worker
    @param n: the number of seconds ago
  */
  const { id, n, trait } = c.req.param();

  route_msg(id, `trait_since_n request made, n: ${n}`);

  const query = db.retrieve_since_n(id, n);

  try {
    return c.json({
      status: "success",
      payload: query.map((obj) => {
        return ppath.get_prop_path(JSON.parse(obj.data), "sysinfo.cpu.usage_percent");
      }),
    }, 200, {});
  } catch (error) {
    console.log(error);
    return c.json({ status: "trait_error" }, 200, {});
  }
});

app.get('/api/workers/:id/trait_last_n/:n/:trait', async (c) => {
  /*
    Retrieve trait from the last n events from the database
    @param id: the id of the worker
    @param n: the number of events to retrieve
  */
  const { id, n, trait } = c.req.param();

  route_msg(id, `trait_last_n request made, n: ${n}`);

  const query = db.retrieve_latest_n(id, n);

  try {
    return c.json({
      status: "success",
      payload: query.map((obj) => {
        return ppath.get_prop_path(JSON.parse(obj.data), "sysinfo.cpu.usage_percent");
      }),
    }, 200, {});
  } catch (error) {
    console.log(error);
    return c.json({ status: "trait_error" }, 200, {});
  }
});

app.post('/api/workers/:id/push', async (c) => {
  /*
    Push data to the server
    @param id: the id of the worker
    @param data: the data to push

    @config workers.id: the id of the device
    @config workers.pk: the private key of the device
    @config server.iv: the initialization vector for the server
  */
  const id = c.req.param('id');

  route_msg(id, `push request made`);

  const data = await c.req.text();
  var dev = cfg.workers.filter((dev) => dev.id == id);
  if (dev.length == 0)
    return c.json({ status: "no_device" }, 200, {});

  try {
    const decoded_q = hashenc.decode_query(
      dev[0].pk,
      cfg.server.iv,
      data
    );

    db.insert_one(id, JSON.parse(decoded_q));
  } catch (error) {
    console.log(error);
    return c.json({ status: "encryption_db_error" }, 200, {});
  }

  return c.json({ status: "success" }, 200, {});
});

export default {
  port: cfg.server.port ?? 8080,
  fetch: app.fetch,
}
