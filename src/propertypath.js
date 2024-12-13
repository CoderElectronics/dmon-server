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
