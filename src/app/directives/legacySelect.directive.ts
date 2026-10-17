import { Directive, OnInit } from '@angular/core';
import { MatSelect } from '@angular/material/select';
import { ConnectedPosition } from '@angular/cdk/overlay';

// Legacy select panel geometry: 3em (48px) rows, at most 256px tall, 16px either side of the trigger text
const ITEM_HEIGHT = 48
const PANEL_MAX_HEIGHT = 256
const PANEL_PADDING_X = 16
const PANEL_MIN_WIDTH = 112
const VIEWPORT_MARGIN = 8

/**
 * Opens mat-select panels where legacy Material did: over the field, with the selected option (or the
 * first one) lined up with the trigger text and scrolled into the middle of a long list. MDC opens them
 * below the field instead.
 */
@Directive({
  selector: 'mat-select',
  standalone: true,
})
export class LegacySelectDirective implements OnInit {

  private scrollTop = 0

  constructor(private select: MatSelect) {}

  ngOnInit(){
    const select = this.select as any
    const open = select.open.bind(select)
    select.open = () => {
      open()
      if(select.panelOpen) this.place()
    }

    // MDC scrolls the active option into view once positioned; legacy scrolled to the computed offset
    select._positioningSettled = () => {
      if(select.panel) select.panel.nativeElement.scrollTop = this.scrollTop
    }
  }

  private place(){
    const select = this.select as any
    const trigger: HTMLElement = select.trigger.nativeElement
    const originRef = select._preferredOverlayOrigin?.elementRef || select._preferredOverlayOrigin || trigger
    const origin: HTMLElement = originRef.nativeElement || originRef
    const triggerRect = trigger.getBoundingClientRect()
    const originRect = origin.getBoundingClientRect()

    // Group labels take a row each, as in legacy
    const options = select.options.toArray()
    const items = options.length + (select.optionGroups ? select.optionGroups.length : 0)
    const selected = options.findIndex((option: any) => option.selected)
    const selectedIndex = Math.max(selected, 0) + this.groupLabelsBefore(Math.max(selected, 0))

    const panelHeight = Math.min(items * ITEM_HEIGHT, PANEL_MAX_HEIGHT)
    const maxScroll = items * ITEM_HEIGHT - panelHeight
    this.scrollTop = Math.min(Math.max(selectedIndex * ITEM_HEIGHT - panelHeight / 2 + ITEM_HEIGHT / 2, 0), maxScroll)

    // Line the chosen option up with the trigger text, then keep the panel inside the viewport
    let top = triggerRect.top - (selectedIndex * ITEM_HEIGHT - this.scrollTop) - (ITEM_HEIGHT - triggerRect.height) / 2
    top = Math.min(top, window.innerHeight - VIEWPORT_MARGIN - panelHeight)
    top = Math.max(top, VIEWPORT_MARGIN)

    const position: ConnectedPosition = {
      originX: 'start',
      originY: 'top',
      overlayX: 'start',
      overlayY: 'top',
      offsetX: Math.round(triggerRect.left - originRect.left - PANEL_PADDING_X),
      offsetY: Math.round(top - originRect.top),
    }
    select._positions = [position]
    select._overlayWidth = Math.max(triggerRect.width + PANEL_PADDING_X * 2, PANEL_MIN_WIDTH)
  }

  private groupLabelsBefore(optionIndex: number): number {
    const select = this.select as any
    if(!select.optionGroups?.length) return 0
    const options = select.options.toArray()
    const groups = select.optionGroups.toArray()
    let count = 0
    for(let i = 0; i <= optionIndex && i < options.length; i++){
      if(options[i].group && options[i].group === groups[count]) count++
    }
    return count
  }
}
