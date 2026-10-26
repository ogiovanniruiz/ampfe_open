import { Component, Input, OnChanges, ViewChild, AfterViewInit, ChangeDetectionStrategy } from '@angular/core';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';

export const TOTALS_LABEL = 'TOTALS';

/**
 * Sortable summary table. The TOTALS row is pinned under the header and never sorted;
 * the label column (User, Activity, Date...) stays fixed while wide tables scroll.
 */
@Component({
  selector: 'app-summary-table',
  templateUrl: './summaryTable.html',
  styleUrls: ['./summaryTable.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class SummaryTableComponent implements OnChanges, AfterViewInit {

  @Input() rows: any[] = [];
  @Input() headers: string[] = [];
  @Input() labelColumn: string = '';

  @ViewChild(MatSort) sort: MatSort;

  dataSource = new MatTableDataSource<any>([]);
  totals: any = null;
  totalColumns: string[] = [];

  constructor() {
    this.dataSource.sortingDataAccessor = (row, column) => sortValue(row[column]);
  }

  ngOnChanges() {
    const rows = this.rows || [];
    this.totals = rows.find(row => row[this.labelColumn] === TOTALS_LABEL) || null;
    this.dataSource.data = rows.filter(row => row !== this.totals);
    this.totalColumns = (this.headers || []).map(header => 'total__' + header);
  }

  ngAfterViewInit() {
    this.dataSource.sort = this.sort;
  }

  get rowCount(): number {
    return this.dataSource.data.length;
  }

  isNumeric(value: any): boolean {
    return typeof value === 'number' || value === null || value === undefined;
  }

  format(value: any): string {
    if (value === null || value === undefined) return '0';
    if (typeof value === 'number') return value.toLocaleString(undefined, {maximumFractionDigits: 2});
    return String(value);
  }

  trackHeader(index: number, header: string) { return header; }
}

// Numbers sort numerically, "45%" sorts as 45, everything else alphabetically
function sortValue(value: any): number | string {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  const percent = /^(-?\d+(\.\d+)?)%$/.exec(String(value).trim());
  if (percent) return parseFloat(percent[1]);
  return String(value).toLowerCase();
}
