/*!
 * Range Selector Module
 * Handles click-and-drag range selection within a container.
 */
export class RangeSelector {
    constructor(container) {
        this.container = container;
        this.selectionBox = document.createElement('div');
        this.selectionBox.className = 'range-selection-box';
        this.isSelecting = false;
        this.startCell = null;
        this.endCell = null;

        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
        this.rangeChangeCallback = () => {};
    }

    enable() {
        this.container.addEventListener('mousedown', this.handleMouseDown);
        this.container.style.cursor = 'crosshair';
        this.container.appendChild(this.selectionBox);
    }

    disable() {
        this.container.removeEventListener('mousedown', this.handleMouseDown);
        this.container.style.cursor = 'default';
        if (this.selectionBox.parentElement) {
            this.selectionBox.parentElement.removeChild(this.selectionBox);
        }
    }

    onRangeChange(callback) {
        this.rangeChangeCallback = callback;
    }

    handleMouseDown(event) {
        const cell = event.target.closest('td, th');
        if (!cell) return;

        this.isSelecting = true;
        this.startCell = cell;
        const rect = this.container.getBoundingClientRect();
        this.startX = event.clientX - rect.left;
        this.startY = event.clientY - rect.top;

        this.selectionBox.style.left = `${this.startX}px`;
        this.selectionBox.style.top = `${this.startY}px`;
        this.selectionBox.style.width = '0px';
        this.selectionBox.style.height = '0px';
        this.selectionBox.style.display = 'block';

        document.addEventListener('mousemove', this.handleMouseMove);
        document.addEventListener('mouseup', this.handleMouseUp);
    }

    handleMouseMove(event) {
        if (!this.isSelecting) return;

        const rect = this.container.getBoundingClientRect();
        const currentX = event.clientX - rect.left;
        const currentY = event.clientY - rect.top;

        const width = currentX - this.startX;
        const height = currentY - this.startY;

        this.selectionBox.style.width = `${Math.abs(width)}px`;
        this.selectionBox.style.height = `${Math.abs(height)}px`;
        this.selectionBox.style.left = `${width > 0 ? this.startX : currentX}px`;
        this.selectionBox.style.top = `${height > 0 ? this.startY : currentY}px`;
    }

    handleMouseUp(event) {
        if (!this.isSelecting) return;

        this.isSelecting = false;
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('mouseup', this.handleMouseUp);

        const cell = event.target.closest('td, th');
        this.endCell = cell || this.endCell;

        if (this.startCell && this.endCell) {
            const startAddress = this.getCellAddress(this.startCell);
            const endAddress = this.getCellAddress(this.endCell);
            this.rangeChangeCallback({ start: startAddress, end: endAddress });
        }

        // Hide the box after a short delay
        setTimeout(() => {
            this.selectionBox.style.display = 'none';
        }, 200);
    }

    getCellAddress(cell) {
        if (!cell) return '';
        const rowIndex = cell.parentElement.rowIndex;
        const colIndex = cell.cellIndex;
        const colLetter = String.fromCharCode(65 + colIndex);
        return `${colLetter}${rowIndex + 1}`;
    }
}