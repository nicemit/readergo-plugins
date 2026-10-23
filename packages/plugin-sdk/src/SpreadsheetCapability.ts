export interface SpreadsheetCapability {
    addRowBelow(): void;
    deleteRow(): void;
    addColumnRight(): void;
    deleteColumn(): void;
    clearCell(): void;
    exportCsv(): void;
}
