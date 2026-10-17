import { Directive, ElementRef, NgZone, AfterViewInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';

export type FitMode = 'labels' | 'icons' | 'menu'

/**
 * Shows toolbar button labels only when they fit. Put it on the element holding the buttons.
 * It measures the buttons with and without labels against the parent's width and sets
 * data-fit="labels" | "icons" | "menu" on the host; the component's CSS does the rest
 * (hide labels for "icons", hide the buttons for "menu").
 *
 * Room is also kept for siblings marked data-fit-fixed (always the same width, e.g. a menu
 * button) and for fitReserve px (e.g. a title that should keep a minimum width).
 */
@Directive({
  selector: '[ampFitLabels]',
  standalone: true,
})
export class FitLabelsDirective implements AfterViewInit, OnDestroy {

  // Minimum width kept free for flexible siblings such as a title
  @Input() fitReserve: number = 0
  // When set, falls back to "menu" (instead of stopping at "icons") when even icons don't fit,
  // and always below this window width
  @Input() fitMenuBelow: number | null = null

  @Output() fitChange = new EventEmitter<FitMode>()

  private mode: FitMode = 'labels'
  private observer: ResizeObserver | null = null
  private frame: number | null = null

  constructor(private host: ElementRef<HTMLElement>, private zone: NgZone) {}

  ngAfterViewInit(){
    const element = this.host.nativeElement
    element.setAttribute('data-fit', this.mode)

    // Watching the host too re-fits when buttons appear after the user's role loads
    this.zone.runOutsideAngular(() => {
      this.observer = new ResizeObserver(() => this.schedule())
      if(element.parentElement) this.observer.observe(element.parentElement)
      this.observer.observe(element)
    })
    this.schedule()
  }

  ngOnDestroy(){
    this.observer?.disconnect()
    if(this.frame !== null) cancelAnimationFrame(this.frame)
  }

  // Batched to one fit per frame, which also avoids ResizeObserver loop warnings
  private schedule(){
    if(this.frame !== null) return
    this.frame = requestAnimationFrame(() => {
      this.frame = null
      this.fit()
    })
  }

  // Measures each mode synchronously, so the trial layouts are never painted
  private fit(){
    const element = this.host.nativeElement
    const parent = element.parentElement
    if(!parent) return

    const style = getComputedStyle(parent)
    const fixed = Array.from(parent.querySelectorAll<HTMLElement>(':scope > [data-fit-fixed]'))
      .reduce((sum, sibling) => sum + sibling.offsetWidth, 0)
    const available = parent.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) - fixed - this.fitReserve

    const widthIn = (mode: FitMode) => {
      element.setAttribute('data-fit', mode)
      return element.scrollWidth
    }
    const labelsWidth = widthIn('labels')
    const iconsWidth = widthIn('icons')

    const menuAllowed = this.fitMenuBelow !== null
    let mode: FitMode
    if(menuAllowed && window.innerWidth < this.fitMenuBelow) mode = 'menu'
    else if(labelsWidth <= available) mode = 'labels'
    else if(iconsWidth <= available || !menuAllowed) mode = 'icons'
    else mode = 'menu'

    element.setAttribute('data-fit', mode)
    if(mode !== this.mode){
      this.mode = mode
      this.zone.run(() => this.fitChange.emit(mode))
    }
  }
}
