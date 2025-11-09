import { RowOutOfBoundsError, ColumnOutOfBoundsError } from '../errors/excel-errors.js';

/**
 * Validates row and column bounds for Excel operations
 */
export class BoundsValidator {
  /**
   * Validate row index is within bounds
   * @throws {RowOutOfBoundsError} if row is out of bounds
   */
  static validateRowIndex(rowIndex, sheetName, rowCount) {
    if (rowIndex < 0 || rowIndex >= rowCount) {
      throw new RowOutOfBoundsError(rowIndex, sheetName, rowCount);
    }
  }

  /**
   * Validate column index is within bounds
   * @throws {ColumnOutOfBoundsError} if column is out of bounds
   */
  static validateColumnIndex(columnIndex, sheetName, columnCount) {
    if (columnIndex < 0 || columnIndex >= columnCount) {
      throw new ColumnOutOfBoundsError(columnIndex, sheetName, columnCount);
    }
  }

  /**
   * Validate both row and column bounds
   * @throws {RowOutOfBoundsError|ColumnOutOfBoundsError} if either is out of bounds
   */
  static validateCellPosition(rowIndex, columnIndex, sheetName, rowCount, columnCount) {
    this.validateRowIndex(rowIndex, sheetName, rowCount);
    this.validateColumnIndex(columnIndex, sheetName, columnCount);
  }

  /**
   * Clamp row index to valid range
   */
  static clampRowIndex(rowIndex, rowCount) {
    return Math.max(0, Math.min(rowIndex, rowCount - 1));
  }

  /**
   * Clamp column index to valid range
   */
  static clampColumnIndex(columnIndex, columnCount) {
    return Math.max(0, Math.min(columnIndex, columnCount - 1));
  }

  /**
   * Clamp both row and column indexes
   */
  static clampCellPosition(rowIndex, columnIndex, rowCount, columnCount) {
    return {
      rowIndex: this.clampRowIndex(rowIndex, rowCount),
      columnIndex: this.clampColumnIndex(columnIndex, columnCount)
    };
  }
}
