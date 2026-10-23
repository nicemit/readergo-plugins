/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Pollinations Beautify Plugin
 * 
 * Stage 2.5: Zero React footprint.
 * Uses ExtensionDescriptors for UI mapping and PluginContext for Host Communication.
 */

import { Plugin, PluginManifest } from '@readergo/plugin-sdk';
import { PluginContext } from '@readergo/plugin-sdk';
import { NoteService } from '@readergo/plugin-sdk';

const manifest: PluginManifest = {
    id: 'readergo.features.pollinations',
    name: 'Pollinations AI Beautify',
    description: 'Beautify notes using Pollinations AI',
    version: '1.0.0',
    category: 'feature',
    provides: ['sidebar-panel'],
    permissions: ['note:read', 'note:write'],
};

export const PollinationsPlugin: Plugin = {
    manifest,
    async activate(context: PluginContext) {
        context.log.info('Pollinations Beautify plugin activated');

        // Register the UI schema for the host to render
        await context.registerExtension({
            id: 'readergo.pollinations.panel',
            type: 'sidebar.panel',
            title: 'AI Assistant',
            renderStrategy: 'host',
            schema: {
                target: 'PollinationsSidebarPanel',
                actionId: 'readergo.pollinations.beautify'
            },
            position: 'right'
        });

        // Register the beautify command
        await context.registerCommand({
            id: 'readergo.pollinations.beautify',
            title: 'Beautify Note',
            description: 'Enhance note content using Pollinations AI',
            category: 'AI',
            handler: async (payload: any) => {
                console.log('[Pollinations] Beautify triggered', payload);
                if (!payload || !payload.noteId) return;
                const { noteId } = payload;
    
                const toast = await context.getCapability<any>('toast-service');
                const noteService = await context.getCapability<NoteService>('note-service');
                const markdownConverter = await context.getCapability<any>('markdown-converter');
    
                if (!noteService) {
                    toast?.error('Please open a note first.');
                    return;
                }
    
                const currentNote = noteService.getCurrentNote();
                if (!currentNote || !currentNote.content) {
                    toast?.error('Note appears empty or not found.');
                    return;
                }
    
                try {
                    toast?.info('Beautifying note with AI...', 'This may take a moment.');
                    const apiKey = "sk_inxbYVx6zqI9Kr4SGeVTUMDXp3Z6hMgo";
    
                    const response = await fetch('https://gen.pollinations.ai/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${apiKey}`,
                        },
                        body: JSON.stringify({
                            messages: [
                                {
                                    role: 'system',
                                    content: `You are an expert editor and writer. Beautify the user's note. Return JSON with "title" and "content" (markdown).`
                                },
                                {
                                    role: 'user',
                                    content: `Title: ${currentNote.title}\n\nContent:\n${currentNote.content}`
                                }
                            ],
                            model: 'openai',
                            response_format: { type: "json_object" }
                        })
                    });
    
                    const data = await response.json();
                    const outputStr = data.choices[0]?.message?.content;
                    const result = JSON.parse(outputStr);
    
                    // Assuming the markdown converter capability injected from the host
                    let htmlContent = result.content;
                    if (markdownConverter) {
                        htmlContent = markdownConverter(result.content);
                    }
    
                    await context.executeCommand('readergo.note.update', {
                        id: noteId,
                        content: htmlContent,
                        title: result.title || currentNote.title
                    });
                    toast?.success('Note beautified successfully!');
                    return { noteId, success: true };
    
                } catch (error) {
                    context.log.error('Error beautifying note:', error);
                    toast?.error('Failed to beautify note');
                    throw error;
                }
            }
        });
    },
    deactivate(context: PluginContext) {
        context.log.info('Pollinations Beautify plugin deactivated');
    }
};
