export function parseGraphDocumentData(data: unknown): { nodes: any[]; edges: any[] } {
  if (!data) return { nodes: [], edges: [] };
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch {
      return { nodes: [], edges: [] };
    }
  }
  const o = data as { nodes?: any[]; edges?: any[] };
  return {
    nodes: Array.isArray(o.nodes) ? o.nodes : [],
    edges: Array.isArray(o.edges) ? o.edges : [],
  };
}

export function shouldHydrateGraphEngine(
  engineState: { nodes: any[]; edges: any[] },
  docData: { nodes: any[]; edges: any[] },
): boolean {
  const engineSnapshot = JSON.stringify({
    nodes: engineState.nodes ?? [],
    edges: engineState.edges ?? [],
  });
  const docSnapshot = JSON.stringify({
    nodes: docData.nodes ?? [],
    edges: docData.edges ?? [],
  });
  return engineSnapshot !== docSnapshot;
}
