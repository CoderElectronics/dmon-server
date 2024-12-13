import YAML from 'yaml';
import fs from 'fs';

export default function config(path) {
  var configObject = new Object();

  var write = () => {
    const cleanObject = Object.fromEntries(
      Object.entries(configObject).filter(([_, value]) => typeof value !== 'function')
    );
    fs.writeFileSync(path, YAML.stringify(cleanObject));
  };

  var read = () => {
    try {
      Object.assign(configObject, YAML.parse(fs.readFileSync(path, "utf-8")));
    } catch (error) {
      Object.assign(configObject, {});
    }
  };

  var retProxy = (obj, root, sub) => {
    return new Proxy(obj, {
      get(target, prop, receiver) {
        read();

        if (!(prop in target)) {
          console.log(`${Bun.color("red", "ansi")}[error]${Bun.color("white", "ansi")} configuration file is malformed or missing fields! check the docs for more info:`, prop);
          return null;
        }

        var value = Reflect.get(target, prop, receiver);
        if (value && typeof value === 'object') {
          return retProxy(value, root, [...sub, prop]);
        }
        return value;
      },

      set(target, prop, value, receiver) {
        read();

        const path = [...sub, prop];
        var cur = root;

        for (let i = 0; i < path.length - 1; i++) {
          if (!cur[path[i]]) {
            cur[path[i]] = {};
          }
          cur = cur[path[i]];
        }
        cur[path[path.length - 1]] = value;

        write();
        return true;
      }
    });
  };

  return retProxy(configObject, configObject, []);
}
