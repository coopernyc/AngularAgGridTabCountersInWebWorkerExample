import {Component, DestroyRef, inject} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {Model} from "./model";
import {GenDataService} from "./gendata.service";
import {
  distinctThrottle,
  IFilterTab,
  IOrder,
  OrderStateEnum,
  ProductTypeEnum,
  productTypePredicate,
  statePredicate
} from "./common";
import {takeUntilDestroyed} from "@angular/core/rxjs-interop";
import {GridModel} from "./grid.model";
import {AgGridAngular} from "ag-grid-angular";
import {ColDef, GridOptions, GridReadyEvent} from "ag-grid-community";
import {FilterTabComponent} from "./filter.tab.component";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, AgGridAngular, FilterTabComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'AngularAgGridTabCountersWebWorkerExample';

  public columnDefs: ColDef[] = [
    { field: "OrderId", headerName: "Order ID", maxWidth: 160 },
    { field: "State", valueFormatter: params => params.value.toUpperCase(), cellClass: params => 'order-state-' + params.value.toLowerCase(), maxWidth: 160 },
    { field: "ProductType", headerName: "Product Type", maxWidth: 160 },
    { field: "Currency", maxWidth: 100 },
    { field: "Price", valueFormatter: params => params.value.toFixed(2), cellClass: 'numeric', width: 100 }

  ];
  public options: GridOptions = {
    onGridReady: this.gridReady.bind(this)
  }
  private readonly model: GridModel<string, IOrder> = new GridModel<string, IOrder>((value: IOrder) => value.OrderId);
  private readonly destroyRef = inject(DestroyRef);
  private readonly THROTTLE_TIME = 300;

  private productTypeTabsModel: Model<string, IFilterTab> = new Model<string, IFilterTab>((tab: IFilterTab) => tab.id);
  private stateTabsModel: Model<string, IFilterTab> = new Model<string, IFilterTab>((tab: IFilterTab) => tab.id);

  constructor(private generator: GenDataService) {
    this.productTypeTabsModel.update({
      id: 'All',
      headerName: 'All',
      selected: true,
      predicate: () => true
    })
    this.productTypeTabsModel.update(Object.values(ProductTypeEnum).map(name => {
      return {
        id: name,
        headerName: name,
        selected: false,
        predicate: (order: IOrder) => productTypePredicate(order, name)
      } as IFilterTab;
    }));
    this.stateTabsModel.update(Object.values(OrderStateEnum).map(name => {
      return {
        id: name,
        headerName: name,
        selected: false,
        predicate: (order: IOrder) => statePredicate(order, name)
      } as IFilterTab;
    }));
  }

  private gridReady(event: GridReadyEvent<any>) {
    this.model.gridApi = event.api;
    this.generator.publish$.pipe(
      takeUntilDestroyed(this.destroyRef),
      distinctThrottle(this.THROTTLE_TIME, x => x.OrderId)
    ).subscribe((orders: IOrder[]) => {

      this.model.updateGrid(orders);
    });
  }

  public get productTypeTabs(): IFilterTab[] {
    return this.productTypeTabsModel.values;
  }

  public productTypeTabSelected(tab: IFilterTab) {
    this.productTypeTabsModel.update(this.productTypeTabsModel.values.map(x => {
      x.selected = x.id === tab.id;
      return x;
    }));
    this.model.predicate = tab.predicate;
  }

  public get stateTabs(): IFilterTab[] {
    return this.stateTabsModel.values;
  }

  public stateTabSelected(tab: IFilterTab) {
    const productPredicate = this.productTypeTabs.find(x => x.selected)!.predicate!;

    this.stateTabsModel.update(this.stateTabsModel.values.map(x => {
      if (x.id === tab.id) {
        x.selected = !x.selected;
      }
      return x;
    }));
    const statesSelected = this.stateTabsModel.model.filter(x => x.selected);
    this.model.predicate = (v) => {
      let cond: boolean = !statesSelected.count();
      if (statesSelected.count()) {
        this.stateTabsModel.model.filter(x => x.selected).forEach(x => {
          cond = cond || x.predicate(v);
        });
      }
      return productPredicate(v) && cond;
    };
  }
}
