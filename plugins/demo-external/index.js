export const MyPlugin = {
    manifest: {
        id: "demo.external.plugin",
        name: "Demo External Plugin",
        version: "1.0.0",
        main: "index.js",
        runtime: "local"
    },
    activate: async (context) => {
        context.log.info("Hello from an safely loaded external ESM module!");

        await context.registerExtension({
            id: `demo.external.plugin.widget`,
            type: 'sidebar.panel',
            title: 'External Widget',
            renderStrategy: 'iframe',
            schema: {
                url: 'data:text/html,<h3 style="color:white;font-family:sans-serif">External Plugin Active!</h3><p style="color:silver;font-family:sans-serif">I was dynamically loaded directly via a native <code>import()</code> URL resolving back to the host!</p>',
                config: {}
            },
            position: 'left',
            order: 2
        });
    },
    deactivate: (context) => {
        context.log.info("External plugin suspended safely.");
    }
}
