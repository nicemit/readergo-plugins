export function snapToGrid(x: number, y: number, size = 32) {
  return {
    x: Math.round(x / size) * size,
    y: Math.round(y / size) * size,
  };
}

