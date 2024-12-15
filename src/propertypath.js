export function get_prop_path(obj, path) {
  // Handle empty or invalid inputs
  if (!obj || !path) return undefined;

  // Split the path into parts
  const parts = path.split(/[\.\[\]]+/).filter(Boolean);

  // Start with the original object
  let current = obj;

  // Traverse the path
  for (const part of parts) {
    // Check if current is null/undefined
    if (current == null) return undefined;

    // Move to the next level
    current = current[part];
  }

  return current;
}

export function list_prop_paths(obj, parentPath = '') {
    const paths = [];

    // Helper function to check if a value is an object
    const isObject = (val) => val && typeof val === 'object' && !Array.isArray(val);
    const isArray = (val) => Array.isArray(val);

    // Recursive function to traverse the object
    function traverse(current, path) {
        // Add the current path if it's not empty
        if (path) paths.push(path);

        if (isObject(current)) {
            // Handle object properties
            for (const key of Object.keys(current)) {
                const newPath = path ? `${path}.${key}` : key;
                traverse(current[key], newPath);
            }
        } else if (isArray(current)) {
            // Handle array indices
            for (let i = 0; i < current.length; i++) {
                const newPath = path ? `${path}[${i}]` : `[${i}]`;
                traverse(current[i], newPath);
            }
        }
    }

    traverse(obj, parentPath);
    return paths;
}
