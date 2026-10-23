'use client';

import { useEffect, useState } from 'react';
function getManager() {
    if (typeof window !== 'undefined' && (window as any).readergo?.manager) {
        return (window as any).readergo.manager;
    }
    return null;
}

export function PluginDevPanel() {
    const [data, setData] = useState<any>({
        plugins: [],
        capabilities: [],
        extensions: [],
        events: [],
        recentEvents: [],
        externalStatuses: [],
        commands: []
    });

    // Refactored to avoid stale closures
    const updateState = () => {
        const manager = getManager();
        if (!manager) return;
        setData((prev: any) => ({
            ...prev,
            plugins: manager.listPluginIntrospection(),
            capabilities: manager.listCapabilities(),
            extensions: manager.listExtensionTypes(),
            events: manager.listEvents(),
            externalStatuses: manager.getExternalPluginStatuses().filter((p: any) => p.source === 'external' || p.source === 'installed'),
            commands: manager.listCommands()
        }));
    };

    useEffect(() => {
        const manager = getManager();
        if (!manager) return;
        updateState();

        const logEvent = (eventName: string) => {
            setData((prev: any) => {
                const history = [{ name: eventName, time: new Date().toLocaleTimeString() }, ...prev.recentEvents].slice(0, 5);
                return { ...prev, recentEvents: history };
            });
            updateState();
        };

        const handler = () => updateState();
        const eventLogger = (name: string) => logEvent(name);

        // Core Status Subscriptions
        manager.on('plugin:status_changed', handler);
        manager.on('plugin:activated', handler);
        manager.on('plugin:failed', handler);

        // Registry Subscriptions
        const unsubRegistry = [
            'system:initialized',
            'plugin:registered',
            'capability:registered',
            'extension:registered',
            'command:registered',
            'command:unregistered'
        ].map(eventName => manager.on(eventName, () => logEvent(eventName)));

        return () => {
            manager.off('plugin:status_changed', handler);
            manager.off('plugin:activated', handler);
            manager.off('plugin:failed', handler);
            unsubRegistry.forEach(unsub => unsub());
        };
    }, []);

    return (
        <div className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-md shadow-sm">
            <div className="p-4 pb-2 border-b border-slate-800">
                <h3 className="text-sm font-bold flex items-center gap-2 text-indigo-400">
                    🛠 Introspection Registry
                </h3>
            </div>
            <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">

                <div>
                    <h4 className="font-semibold text-slate-300 mb-1 border-b border-slate-700 pb-1">
                        Active Plugins ({data.plugins.length})
                    </h4>
                    <ul className="space-y-1 mt-2">
                        {data.plugins.map((p: any) => (
                            <li key={p.manifest.id}>
                                <div>
                                    <span className="text-green-400 mr-1">●</span>
                                    {p.manifest.id}
                                    <span className={`ml-2 text-[10px] px-1 rounded ${p.manifest.source === 'external' ? 'bg-orange-800 text-orange-200' : 'bg-slate-800 text-slate-400'}`}>
                                        {p.manifest.source || 'bundled'}
                                    </span>
                                    {p.manifest.source === 'external' && <span className="ml-1 text-[10px] bg-red-900/50 text-red-300 px-1 rounded">{p.manifest.trust || 'untrusted'}</span>}
                                    {p.manifest.runtime && <span className={`ml-1 text-[10px] px-1 rounded ${p.manifest.runtime === 'worker' ? 'bg-fuchsia-900/50 text-fuchsia-300' : 'bg-sky-900/50 text-sky-300'}`}>
                                        {p.manifest.runtime === 'worker' ? 'WebWorker ⚡' : 'Native UI'}
                                    </span>}
                                </div>
                                {p.permissions?.length > 0 && (
                                    <div className="pl-5 mt-1 flex gap-1 flex-wrap">
                                        <span className="text-[9px] text-slate-500 uppercase">Grants:</span>
                                        {p.permissions.map((perm: string) => (
                                            <span key={perm} className="text-[9px] bg-emerald-900 text-emerald-300 px-1 rounded">
                                                {perm}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>

                {data.externalStatuses.length > 0 && (
                    <div>
                        <h4 className="font-semibold text-orange-300 mb-1 border-b border-orange-700/50 pb-1 flex justify-between">
                            <span>External Dev Plugins ({data.externalStatuses.length})</span>
                        </h4>
                        <ul className="space-y-2 mt-2">
                            {data.externalStatuses.map((ext: any) => (
                                <li key={ext.id} className="bg-slate-800/50 border border-slate-700 p-2 rounded">
                                    <div className="flex justify-between items-center">
                                        <code className="text-orange-300 font-bold">{ext.id}</code>
                                        <span className={`text-[10px] px-1 rounded uppercase ${ext.status === 'active' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                                            {ext.status}
                                        </span>
                                    </div>
                                    <div className="text-[10px] mt-1 text-slate-400">Path: <code>{ext.path}</code> ({ext.runtime})</div>
                                    <div className="text-[10px] text-fuchsia-400">URL <code>?v=</code> Hash: {ext.versionHash?.substring(0, 8) || 'none'}</div>

                                    {ext.errors?.length > 0 && (
                                        <div className="mt-2 bg-red-950/50 border border-red-900 p-1 text-red-400 text-[10px] rounded">
                                            {ext.errors.map((err: string, i: number) => <div key={i}>💥 {err}</div>)}
                                        </div>
                                    )}
                                    {ext.warnings?.length > 0 && (
                                        <div className="mt-1 bg-yellow-950/50 border border-yellow-900 p-1 text-yellow-500 text-[10px] rounded">
                                            {ext.warnings.map((err: string, i: number) => <div key={i}>⚠️ {err}</div>)}
                                        </div>
                                    )}

                                    {ext.capabilityRequests?.length > 0 && (
                                        <div className="mt-2 border-t border-slate-700 pt-1">
                                            <div className="text-[9px] text-slate-400 uppercase tracking-wider mb-1">Capability Negotiation</div>
                                            <ul className="space-y-[2px]">
                                                {ext.capabilityRequests.map((req: any, i: number) => (
                                                    <li key={i} className="flex justify-between items-center text-[10px] bg-slate-900 px-1 py-0.5 rounded border border-slate-800">
                                                        <span><span className="text-teal-400 font-mono">{req.capabilityId}</span> <span className="text-slate-500">v{req.requestedVersion || 'latest'}</span></span>
                                                        <span className="flex items-center gap-1">
                                                            {req.resolutionMode ? (
                                                                <span className={`px-1 rounded text-[9px] border ${req.resolutionMode === 'exact' ? 'bg-teal-900/50 text-teal-300 border-teal-800/50' :
                                                                    req.resolutionMode === 'fallback-compatible' ? 'bg-indigo-900/50 text-indigo-300 border-indigo-800/50' :
                                                                        'bg-red-900/50 text-red-300 border-red-800/50'
                                                                    }`}>
                                                                    {req.resolutionMode === 'rejected' ? 'rejected' : `${req.resolutionMode} v${req.resolvedVersion}`}
                                                                </span>
                                                            ) : (
                                                                req.resolvedVersion ? (
                                                                    <span className="bg-teal-900/50 text-teal-300 px-1 rounded text-[9px] border border-teal-800/50">resolved v{req.resolvedVersion}</span>
                                                                ) : (
                                                                    <span className="bg-red-900/50 text-red-300 px-1 rounded text-[9px] border border-red-800/50">rejected</span>
                                                                )
                                                            )}
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                <div>
                    <h4 className="font-semibold text-slate-300 mb-1 border-b border-slate-700 pb-1">
                        Capabilities ({data.capabilities.length})
                    </h4>
                    <ul className="space-y-1">
                        {data.capabilities.map((c: any) => (
                            <li key={c.id}>
                                <code>{c.id}</code>
                                <div className="text-slate-500 pl-2 text-[10px]">{c.description}</div>
                            </li>
                        ))}
                    </ul>
                </div>

                <div>
                    <h4 className="font-semibold text-slate-300 mb-1 border-b border-slate-700 pb-1">
                        Extension Hooks ({data.extensions.length})
                    </h4>
                    <ul className="space-y-1">
                        {data.extensions.map((e: any) => (
                            <li key={e.type}>
                                <code>{e.type}</code>
                                <div className="text-slate-500 pl-2 text-[10px]">{e.description}</div>
                            </li>
                        ))}
                    </ul>
                </div>

                <div>
                    <h4 className="font-semibold text-slate-300 mb-1 border-b border-slate-700 pb-1">
                        Live Event Stream
                    </h4>
                    <ul className="space-y-1">
                        {data.recentEvents.map((evt: any, i: number) => (
                            <li key={i} className="font-mono text-[10px] text-blue-300">
                                [{evt.time}] {evt.name}
                            </li>
                        ))}
                        {data.recentEvents.length === 0 && <span className="text-slate-500 italic">Listening...</span>}
                    </ul>
                </div>

                <div>
                    <h4 className="font-semibold text-slate-300 mb-1 border-b border-slate-700 pb-1">
                        Commands ({data.commands.length})
                    </h4>
                    <ul className="space-y-1 mt-2">
                        {data.commands.map((cmd: any) => (
                            <li key={cmd.id} className="flex justify-between items-start">
                                <div>
                                    <code className="text-cyan-400">{cmd.id}</code>
                                    <div className="text-slate-400 text-[10px] pl-2">{cmd.title}</div>
                                </div>
                                <div className="flex gap-1 items-center flex-shrink-0">
                                    {cmd.category && <span className="text-[9px] bg-violet-900/50 text-violet-300 px-1 rounded">{cmd.category}</span>}
                                    {cmd.shortcut && <span className="text-[9px] bg-slate-800 text-slate-400 px-1 rounded font-mono">{cmd.shortcut}</span>}
                                    <span className="text-[9px] bg-slate-800 text-slate-500 px-1 rounded">{cmd.pluginId}</span>
                                </div>
                            </li>
                        ))}
                        {data.commands.length === 0 && <span className="text-slate-500 italic">No commands registered</span>}
                    </ul>
                </div>

            </div>
        </div>
    );
}
