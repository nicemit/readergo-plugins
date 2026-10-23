'use client';

import React, { useState } from 'react';
import { Wand2, Loader2 } from 'lucide-react';
import { executeCommand } from '@/lib/platform/actions';

interface PollinationsSidebarPanelProps {
    noteId?: string | null;
    actionId: string;
}

export const PollinationsSidebarPanel: React.FC<PollinationsSidebarPanelProps> = ({ noteId, actionId }) => {
    const [isProcessing, setIsProcessing] = useState(false);

    const handleBeautify = async () => {
        if (!noteId) return;
        setIsProcessing(true);

        try {
            await executeCommand(actionId, { noteId });
        } catch (error) {
            console.error('[PollinationsSidebarPanel] Action failed:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    if (!noteId) return null;

    return (
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">AI Assistant</h3>
            <button
                onClick={handleBeautify}
                disabled={isProcessing}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg shadow-md hover:shadow-lg hover:from-purple-500 hover:to-pink-500 transform transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed group"
            >
                {isProcessing ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                    <Wand2 className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                )}
                <span className="font-semibold">Beautify Note</span>
            </button>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 text-center">
                Uses Pollinations AI to enhance your writing.
            </p>
        </div>
    );
};
