/*!
 * Cell Selector Module
 * Handles single cell selection within a container.
 */
export class CellSelector {
    constructor(container) {
        this.container = container;
        this.selectedCell = null;
        this.selectCallback = () => {};
        this.handleClick = this.handleClick.bind(this);
    }

    enable() {
        this.container.addEventListener('click', this.handleClick);
        this.container.style.cursor = 'cell';
    }

    disable() {
        this.container.removeEventListener('click', this.handleClick);
        this.container.style.cursor = 'default';
        this.clearSelection();
    }

    onSelect(callback) {
        this.selectCallback = callback;
    }

    handleClick(event) {
        const cell = event.target.closest('td, th');
        if (!cell) return;

        this.clearSelection();
        this.selectedCell = cell;
        cell.classList.add('cell-selected');

        const rowIndex = cell.parentElement.rowIndex;
        const colIndex = cell.cellIndex;
        const colLetter = String.fromCharCode(65 + colIndex);
        const cellAddress = `${colLetter}${rowIndex + 1}`;

        this.selectCallback(cellAddress);
    }

    clearSelection() {
        if (this.selectedCell) {
            this.selectedCell.classList.remove('cell-selected');
        }
        this.selectedCell = null;
    }
}