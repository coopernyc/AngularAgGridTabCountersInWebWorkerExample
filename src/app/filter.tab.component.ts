import {Component, EventEmitter, Input, Output} from "@angular/core";
import {IFilterTab} from "./common";

@Component({
  selector: 'app-filter-tab',
  standalone: true,
  template: `
    <div class="filter-tab-container">
      @for (tab of tabs; track tab.id) {
        <div class="filter-tab"
             [class.filter-tab-selected]="tab.selected"
             (click)="selectTab(tab)"
        >
          <div class="filter-tab-header">{{tab.headerName}}</div>
          @if (tab.counter && tab.counter > 0) {
            <div class="filter-tab-counter" [class.critical]="tab.critical"><span>{{tab.counter}}</span></div>
          }
        </div>
      }
    </div>
  `,
  styleUrls: ['./filter.tab.component.scss'],
})
export class FilterTabComponent {
  @Input() tabs!: IFilterTab[];
  @Output() tabSelected$: EventEmitter<IFilterTab> = new EventEmitter<IFilterTab>();
  public selectTab(tab: any) {
    this.tabSelected$.next(tab);
  }
}
