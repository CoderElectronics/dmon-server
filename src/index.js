import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/bun'
import { Database } from "bun:sqlite";

import * as db from "./db.js"
import * as hashenc from "./hashenc.js"
import * as ppath from "./propertypath.js"
import config from "./config.js"

/* cfg and database */
var cfg = config("server_config.yaml");
db.initialize(cfg.server.db ?? "dmon_state.db");

/* initialize Hono server */
var app = new Hono();
var jwt_secret = hashenc.generate_jwt_key();

app.use('/*', cors({
  origin: ['http://localhost:3000'],
  allowMethods: ['POST', 'GET', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length', 'X-Requested-With'],
  maxAge: 3600,
  credentials: true
}))

/* frontend API routes and jwt code */
async function checkAuth(c, next) {
  const auth = c.req.header('Authorization');
  if (!auth || !auth.startsWith('Basic ')) {
    return c.json({ status: 'error', message: 'No credentials provided' }, 401);
  }

  const [username, password] = atob(auth.split(' ')[1]).split(':');

  if (cfg.auth.filter(item => item.password === password && item.username === username).length > 0) {
    return await next();
  }

  return c.json({
    status: 'error',
    message: 'Invalid credentials'
  }, 401);
}

app.use('/api/ui/*', checkAuth);

app.get('/', (c) => {
  route_msg("home", `home page request made, redirecting`);
  return c.redirect('/ui/index.html');
});

app.use('/ui/*', serveStatic({
  root: './ui/public/',
  rewriteRequestPath: (path) => {
    return path.replace(/^\/ui/, '');
  }
}));

/* backend API routes */
function route_msg(type, msg) {
  console.log(`${Bun.color("green", "ansi")}[${type}]${Bun.color("white", "ansi")} ${msg}`);
}

app.post('/api/ui/auth', async (c) => {
  route_msg("webui", `auth request made`);

  return c.json({
    status: 'success',
    message: 'Authentication successful'
  }, 200);
});

app.get('/api/ui/list_ids', async (c) => {
  /*
    List all worker ids
  */
  route_msg("webui", `list_ids request made`);

  return c.json({
    status: "success",
    payload: cfg.workers.map((worker) => worker.id)
  }, 200, {});
});

app.get('/api/ui/traits/:id', async (c) => {
  /*
    Retrieve the last n events from the database
    @param id: the id of the worker
    @param n: the number of events to retrieve
  */
  const { id } = c.req.param();

  route_msg(id, `traits request made`);

  try {
    const query = db.retrieve_latest_n(id, 1);
    return c.json({
      status: "success",
      payload: ppath.list_prop_paths(JSON.parse(query[0].data))
    }, 200, {});
  } catch (error) {
    console.log(error);
    return c.json({ status: "error" }, 200, {});
  }
});

app.get('/api/ui/last_n/:id/:n', async (c) => {
  /*
    Retrieve the last n events from the database
    @param id: the id of the worker
    @param n: the number of events to retrieve
  */
  const { id, n } = c.req.param();

  route_msg(id, `last_n request made, n: ${n}`);

  try {
    const query = db.retrieve_latest_n(id, n);
    return c.json({ status: "success", payload: query }, 200, {});
  } catch (error) {
    console.log(error);
    return c.json({ status: "error" }, 200, {});
  }
});

app.get('/api/ui/since_n/:id/:n', async (c) => {
  /*
    Retrieve all events since the n seconds ago
    @param id: the id of the worker
    @param n: the number of seconds ago
  */
  const { id, n } = c.req.param();

  route_msg(id, `since_n request made, n: ${n}`);

  try {
    const query = db.retrieve_since_n(id, n);
    return c.json({ status: "success", payload: query }, 200, {});
  } catch (error) {
    console.log(error);
    return c.json({ status: "error" }, 200, {});
  }
});

app.get('/api/ui/trait_since_n/:id/:n/:trait', async (c) => {
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
        return ppath.get_prop_path(JSON.parse(obj.data), trait);
      }),
    }, 200, {});
  } catch (error) {
    console.log(error);
    return c.json({ status: "trait_error" }, 200, {});
  }
});

app.get('/api/ui/trait_last_n/:id/:n/:trait', async (c) => {
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
        return ppath.get_prop_path(JSON.parse(obj.data), trait);
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
    @param data: the data to push in format: {iv: string, payload: string}
    where iv is base64 encoded and payload is the encrypted data

    @config workers.id: the id of the device
    @config workers.pk: the private key of the device
  */
  const id = c.req.param('id');
  route_msg(id, `push request made`);

  try {
    const encryptedData = await c.req.json(); // Expect { iv: string, payload: string }

    if (!encryptedData.iv || !encryptedData.payload) {
      return c.json({ status: "invalid_format" }, 400, {});
    }

    var dev = cfg.workers.filter((dev) => dev.id == id);
    if (dev.length == 0) {
      return c.json({ status: "no_device" }, 200, {});
    }

    const decoded_q = hashenc.decode_query(
      dev[0].pk,
      encryptedData.iv, // Use the IV sent with the request
      encryptedData.payload
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
