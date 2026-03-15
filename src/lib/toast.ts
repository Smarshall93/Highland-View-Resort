import { toast as sonnerToast } from "sonner";
/**
 * Re-exporting toast from a non-component file to satisfy
 * react-refresh/only-export-components lint rules.
 */
export const toast = sonnerToast;