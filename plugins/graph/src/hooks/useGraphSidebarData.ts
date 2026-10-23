import { useState, useEffect, useRef } from 'react';

// PART 1 - Global Cache (Stable + Extensible)
const graphSidebarCache = new Map<string, any[]>();

function getCacheKey(documentId: string) {
  return `graph:${documentId}`;
}

export function invalidateGraphSidebarCache(documentId: string) {
  const key = getCacheKey(documentId);
  graphSidebarCache.delete(key);
}

// PART 2 - Hook Implementation
export function useGraphSidebarData(documentId: string | null, context: any, isExpanded: boolean) {
  const [linkedGraphs, setLinkedGraphs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const hasLoadedRef = useRef(false);
  const isLoadingRef = useRef(false);
  const requestIdRef = useRef(0);

  // PART 4 - Load Function (Deduped + Safe)
  const loadGraphs = async () => {
    if (!documentId) return;

    const key = getCacheKey(documentId);

    // Return cached immediately
    if (graphSidebarCache.has(key)) {
      setLinkedGraphs(graphSidebarCache.get(key) || []);
      hasLoadedRef.current = true;
      return;
    }

    if (isLoadingRef.current) return;

    isLoadingRef.current = true;
    setIsLoading(true);

    const requestId = ++requestIdRef.current;
    console.log("[useGraphSidebarData] loadGraphs triggers:", { documentId, key, requestId });

    try {
      const result = await context.executeCommand('graph.getLinkedDocuments', { documentId }) as any[];
      console.log("[useGraphSidebarData] Command result:", result);

      if (requestId !== requestIdRef.current) {
        console.warn("[useGraphSidebarData] Stale request id mismatch:", { requestId, current: requestIdRef.current });
        return;
      }

      const dataToCache = Array.isArray(result) ? result : [];
      graphSidebarCache.set(key, dataToCache);
      setLinkedGraphs(dataToCache);
      hasLoadedRef.current = true;
    } catch (err) {
      console.error("[GraphSidebarPanel] Failed to load linked documents:", err);
    } finally {
      if (requestId === requestIdRef.current) {
        isLoadingRef.current = false;
        setIsLoading(false);
      }
    }

  };

  // PART 3 - Lazy Load Trigger (Effect-Based)
  useEffect(() => {
    if (!isExpanded) return;

    if (!hasLoadedRef.current && !isLoadingRef.current) {
      loadGraphs();
    }
  }, [isExpanded, documentId]);

  // PART 5 - Reset on Document Change
  useEffect(() => {
    hasLoadedRef.current = false;
    requestIdRef.current = 0;
    // We do NOT trigger load automatically here, satisfies lazy loading rule.
  }, [documentId]);

  return { linkedGraphs, isLoading };
}
