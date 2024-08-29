import {ICellRendererAngularComp} from "ag-grid-angular";
import {Component} from "@angular/core";
import {ICellRendererParams} from "ag-grid-community";

@Component({
  standalone: true,
  template: `<div>
    <div [class]="'flag-' + value"></div>
    <span>{{value}}</span>
  </div>`
})
export class CurrencyRenderer implements ICellRendererAngularComp {
  public value!: string;
  agInit(params: ICellRendererParams): void {
    this.refresh(params);
  }

  // Return Cell Value
  refresh(params: ICellRendererParams): boolean {
    this.value = params.value;
    return true;
  }
}
