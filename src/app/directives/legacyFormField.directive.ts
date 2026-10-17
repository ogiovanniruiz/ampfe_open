import { Directive, ElementRef, NgZone, AfterViewInit, OnDestroy } from '@angular/core';

/**
 * Keeps --amp-prefix-width on every mat-form-field: the layout width of its prefix (icon or text),
 * 0px without one. styles.scss uses it to place outline labels and their notch after the prefix,
 * where legacy fields put them. MDC measures the prefix itself only once, with getBoundingClientRect,
 * which comes out short while a dialog is still zooming in.
 */
@Directive({
  selector: 'mat-form-field',
  standalone: true,
})
export class LegacyFormFieldDirective implements AfterViewInit, OnDestroy {

  private observer: ResizeObserver | null = null

  constructor(private host: ElementRef<HTMLElement>, private zone: NgZone) {}

  ngAfterViewInit(){
    // The prefix can come and go (*ngIf), so watch the field and re-read it each time
    this.zone.runOutsideAngular(() => {
      this.observer = new ResizeObserver(() => this.update())
      this.observer.observe(this.host.nativeElement)
    })
    this.update()
  }

  ngOnDestroy(){
    this.observer?.disconnect()
  }

  private update(){
    const element = this.host.nativeElement
    const prefix = element.querySelector<HTMLElement>('.mat-mdc-form-field-icon-prefix, .mat-mdc-form-field-text-prefix')
    element.style.setProperty('--amp-prefix-width', `${prefix ? prefix.offsetWidth : 0}px`)
  }
}
