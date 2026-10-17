import { Component, Inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MaterialModule } from '../../material.module';

export interface ConfirmDialogData {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

/**
 * In-app replacement for the browser's confirm(). A blocked native confirm() returns false without
 * showing anything (e.g. after Chrome's "prevent additional dialogs"), which silently stopped actions.
 */
@Component({
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './confirmDialog.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['../../styles/dialog-common.scss'],
})
export class ConfirmDialog {
  constructor(
    public dialogRef: MatDialogRef<ConfirmDialog, boolean>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData,
  ) {}
}

// Resolves true only when the user confirms; Cancel, Esc and the backdrop all give false.
// Its own panel class keeps it a small card on phones, where other dialogs go full screen.
export function confirmAction(dialog: MatDialog, data: ConfirmDialogData): Promise<boolean> {
  const ref = dialog.open(ConfirmDialog, {data, autoFocus: false, width: '400px', maxWidth: '94vw', panelClass: 'app-confirm-dialog'})
  return firstValueFrom(ref.afterClosed()).then(result => result === true)
}
