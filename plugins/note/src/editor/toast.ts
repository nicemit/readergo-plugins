import { executeCommand } from '@/lib/platform/actions';

export const showToast = {
  success: (message: string, description?: any) => {
    void executeCommand('readergo.toast.show', { type: 'success', message, description });
  },
  error: (message: string, description?: any) => {
    void executeCommand('readergo.toast.show', { type: 'error', message, description });
  },
  info: (message: string, description?: any) => {
    void executeCommand('readergo.toast.show', { type: 'info', message, description });
  },
  warning: (message: string, description?: any) => {
    void executeCommand('readergo.toast.show', { type: 'warning', message, description });
  },
};
