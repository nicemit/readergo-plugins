export interface Point {
    x: number;
    y: number;
}

export interface Rect {
    left: number;
    top: number;
    width: number;
    height: number;
}

/**
 * Convert Canvas coordinate to Screen coordinate
 */
export function canvasToScreen(x: number, y: number, pan: Point, zoom: number): Point {
    return {
        x: (x + pan.x) * zoom,
        y: (y + pan.y) * zoom
    };
}

/**
 * Convert Screen coordinate to Canvas coordinate
 */
export function screenToCanvas(clientX: number, clientY: number, pan: Point, zoom: number, canvasRect: Rect): Point {
    return {
        x: (clientX - canvasRect.left) / zoom - pan.x,
        y: (clientY - canvasRect.top) / zoom - pan.y
    };
}

/**
 * Get center of a Node (Width: 200, Height: 56)
 */
export function getNodeCenter(node: { x: number; y: number }): Point {
    return {
        x: node.x + 100,
        y: node.y + 28
    };
}

/**
 * Calculate Edge Control Point factor
 */
export function getEdgeFactor(x1: number, x2: number, zoom: number): number {
    const dx = Math.abs(x2 - x1);
    return Math.min(Math.max(dx * 0.5, 50), 120) * zoom;
}
