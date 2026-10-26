export interface ToastAction {
    label: string;
    onClick: () => void;
}

export interface ToastOptions {
    description?: string;
    action?: ToastAction;
    duration?: number;
}

export interface ToastService {
    success(message: string, descriptionOrOptions?: string | ToastOptions): void;
    error(message: string, descriptionOrOptions?: string | ToastOptions): void;
    info(message: string, descriptionOrOptions?: string | ToastOptions): void;
    warning(message: string, descriptionOrOptions?: string | ToastOptions): void;
}

