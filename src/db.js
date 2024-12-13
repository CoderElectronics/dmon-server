import { randomUUIDv7 } from "bun";
import { Database } from "bun:sqlite";
export var db = null;

export function initialize(path) {
  try {
    db = new Database(path, { readwrite: true, create: true });
  } catch (error) {
    console.log("DB error:", error);
    db = null;
  }
  return db;
}

export function insert_one(id, contents) {
  db.exec(`
    CREATE TABLE
      IF NOT EXISTS events_${id} (
        key TEXT PRIMARY KEY,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        data TEXT
      );
  `);

  const stmt = db.prepare(`
    INSERT
      INTO events_${id}(key, data)
      VALUES($key, $data);
  `);

  return stmt.run({
    $key: randomUUIDv7(),
    $data: JSON.stringify(contents)
  });
}

export function retrieve_latest_n(id, n) {
  var get_q = db.query(`
    SELECT *
    FROM events_${id}
    ORDER by (julianday(DATETIME('NOW')) - julianday(timestamp)) ASC
    LIMIT ${n}
  `);

  return get_q.all();
}

export function retrieve_since_n(id, seconds) {
  const stmt = db.prepare(`
    SELECT *
    FROM events_${id}
    WHERE datetime(timestamp) >= datetime('now', '-' || $seconds || ' seconds')
    ORDER BY timestamp DESC
  `);

  return stmt.all({
    $id: id,
    $seconds: seconds
  });
}
