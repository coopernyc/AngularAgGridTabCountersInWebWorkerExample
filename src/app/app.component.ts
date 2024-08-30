import {Component, DestroyRef, inject} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {Model} from "./model";
import {GenDataService} from "./gendata.service";
import {
  basketPredicate,
  distinctThrottle, electronicPredicate,
  IFilterTab,
  IOrder,
  OrderStateEnum,
  ProductTypeEnum,
  productTypePredicate,
  statePredicate, voicePredicate, WorkerTopic
} from "./common";
import {takeUntilDestroyed} from "@angular/core/rxjs-interop";
import {GridModel} from "./grid.model";
import {AgGridAngular} from "ag-grid-angular";
import {ColDef, GetRowIdParams, GridOptions, GridReadyEvent} from "ag-grid-community";
import {FilterTabComponent} from "./filter.tab.component";
import _ from "lodash";
import {CurrencyRenderer} from "./currency.renderer";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, AgGridAngular, FilterTabComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {

  private readonly model: GridModel<string, IOrder> = new GridModel<string, IOrder>((value: IOrder) => value.OrderId);
  private readonly destroyRef = inject(DestroyRef);
  private readonly THROTTLE_TIME = 300;
  private readonly worker: Worker | undefined;
  private readonly numberFormatter = new Intl.NumberFormat('en-US');
  private readonly productTypeTabsModel: Model<string, IFilterTab> = new Model<string, IFilterTab>((tab: IFilterTab) => tab.id);
  private readonly stateTabsModel: Model<string, IFilterTab> = new Model<string, IFilterTab>((tab: IFilterTab) => tab.id);
  private readonly extraTabsModel: Model<string, IFilterTab> = new Model<string, IFilterTab>((tab: IFilterTab) => tab.id);
  private stateSelectedTabSelectedId!: string[];
  private productTypeTabSelectedId!: string;
  public readonly title: string = 'AngularAgGridTabCountersWebWorkerExample';
  public columnDefs: ColDef[] = [
    {field: "OrderId", headerName: "Order ID", cellClass: 'order-id', maxWidth: 160},
    {
      field: "OrderType",
      headerName: "Order Type",
      cellClass: params => 'order-type-' + params.value.toLowerCase(),
      maxWidth: 120
    },
    {
      field: "State",
      headerName: "Order State",
      valueFormatter: params => params.value.toUpperCase(),
      cellClass: params => 'order-state-' + params.value.toLowerCase(),
      maxWidth: 160
    },
    {field: "ProductType", headerName: "Product Type", maxWidth: 160},
    {
      field: "Quantity",
      valueFormatter: params => this.numberFormatter.format(params.value.toFixed(0)),
      cellClass: 'numeric',
      width: 100
    },
    {field: "Side", cellClass: params => 'order-side-' + params.value.toLowerCase(), maxWidth: 80},
    {
      field: "Price",
      valueFormatter: params => this.numberFormatter.format(params.value.toFixed(2)),
      cellClass: 'numeric',
      width: 100
    },
    {field: "Currency", maxWidth: 100, cellRenderer: CurrencyRenderer},
    {field: "Broker", width: 150},
    {field: "BasketId", headerName: "Basket ID", maxWidth: 120},
    {field: "OrderTime", headerName: "Order Time", maxWidth: 200},
    {field: "Trader", headerName: "Trader", maxWidth: 200},
  ];

  constructor(private generator: GenDataService) {

    if (typeof Worker !== "undefined") {
      this.worker = new Worker(new URL("./worker", import.meta.url));
    } else {
      throw new Error('Worker is not supported');
    }

    this.productTypeTabsModel.update([
      {
        id: 'All',
        headerName: 'All',
        selected: true,
        predicate: () => true
      },
      ...Object.values(ProductTypeEnum).map(name => {
        return {
          id: name,
          headerName: name,
          selected: false,
          predicate: (order: IOrder) => productTypePredicate(order, name)
        } as IFilterTab;
      })
    ]);
    this.stateTabsModel.update(Object.values(OrderStateEnum).map(name => {
      return {
        id: name,
        headerName: name,
        selected: false,
        critical: _.includes([OrderStateEnum.Failed, OrderStateEnum.Cancelled], name),
        predicate: (order: IOrder) => statePredicate(order, name)
      } as IFilterTab;
    }));
    this.extraTabsModel.update([
      {
        id: 'Voice',
        headerName: 'Voice',
        selected: false,
        predicate: (order: IOrder) => voicePredicate(order)
      },
      {
        id: 'Electronic',
        headerName: 'Electronic',
        selected: false,
        predicate: (order: IOrder) => electronicPredicate(order)
      },
      {
        id: 'Basket',
        headerName: 'In Basket',
        selected: false,
        predicate: (order: IOrder) => basketPredicate(order)
      }
    ]);
  }

  public options: GridOptions = {
    onGridReady: this.gridReady.bind(this),
    getRowId: (params: GetRowIdParams) => {
      return params.data.OrderId;
    }
  }

  private gridReady(event: GridReadyEvent<any>) {
    this.model.gridApi = event.api;

    const updateTabs = (data: IOrder[], ...models: Model<string, IFilterTab>[]) => {
      models.forEach(model => {
        model.update(_.map(data, (v: any, k: string) => {
          const tab = model.get(k)!;
          if (tab) {
            tab.counter = v;
          }
          return tab;
        }).filter(tab => !!tab));
      });
    }

    if (this.worker) {
      this.worker.onmessage = ({data}) => {
        console.log('Blotter received tab counters');
        updateTabs(data, this.productTypeTabsModel, this.stateTabsModel, this.extraTabsModel);
      }
      this.worker.postMessage({
        topic: WorkerTopic.Setup,
        value: {
          product_type_tabs: this.productTypeTabsModel.values.map(x => _.omit(x, "predicate")),
          state_tabs: this.stateTabsModel.values.map(x => _.omit(x, "predicate")),
          extra_tabs: this.extraTabsModel.values.map(x => _.omit(x, "predicate"))
        }
      });
    }
    this.generator.publish$.pipe(
      takeUntilDestroyed(this.destroyRef),
      distinctThrottle(this.THROTTLE_TIME, (x: IOrder) => x.OrderId)
    ).subscribe((orders: IOrder[]) => {
      this.model.updateGrid(orders);
      if (this.worker) {
        this.worker.postMessage({
          topic: WorkerTopic.ModelUpdate,
          value: {
            operator: "update",
            data: orders
          }
        });
      }
    });
  }

  public get productTypeTabs(): IFilterTab[] {
    return this.productTypeTabsModel.values;
  }

  private tabSelectionChanged(): void {
    if (this.worker) {
      this.worker.postMessage({
        topic: WorkerTopic.TabSelectedChange,
        value: {
          product_type_tab: this.productTypeTabSelectedId,
          state_tabs: this.stateSelectedTabSelectedId
        }
      });
    }
  }

  public productTypeTabSelected(tab: IFilterTab) {
    this.productTypeTabsModel.update(this.productTypeTabsModel.values.map(x => {
      x.selected = x.id === tab.id;
      return x;
    }));
    this.model.predicate = tab.predicate;
    this.productTypeTabSelectedId = tab.id;
    this.tabSelectionChanged();
  }

  public get stateTabs(): IFilterTab[] {
    return this.stateTabsModel.values;
  }

  public stateTabSelected(tab: IFilterTab) {
    const productPredicate = this.productTypeTabsModel.model.find(x => x.selected)!.predicate!;

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

    this.stateSelectedTabSelectedId = statesSelected.valueSeq().map(x => x.id).toArray();
    this.tabSelectionChanged();
  }

  public get extraTabs(): IFilterTab[] {
    return this.extraTabsModel.values;
  }

  public extraTabSelected(tab: IFilterTab) {
    const productPredicate = this.productTypeTabsModel.model.find(x => x.selected)!.predicate!;
    const statePredicates = this.stateTabsModel.model.filter(x => x.selected).map(x => x.predicate);

    this.extraTabsModel.update(this.extraTabsModel.values.map(x => {
      if (x.id === tab.id) {
        x.selected = !x.selected;
      }
      return x;
    }));

    if (tab.id === 'Voice' && this.extraTabsModel.get('Voice')!.selected) {
      const t = this.extraTabsModel.get('Electronic')!;
      t.selected = false;
      this.extraTabsModel.update(t);
    } else if (tab.id === 'Electronic' && this.extraTabsModel.get('Electronic')!.selected) {
      const t = this.extraTabsModel.get('Voice')!;
      t.selected = false;
      this.extraTabsModel.update(t);
    }

    const extraPredicates = this.extraTabsModel.model.filter(x => x.selected).map(x => x.predicate);
    this.model.predicate = (v) => {
      let stateCondition = statePredicates.count() === 0;
      statePredicates.forEach(p => {
        stateCondition = stateCondition || p(v);
      });
      let extraCondition = true;
      extraPredicates.forEach(p => {
        extraCondition = extraCondition && p(v);
      });
      return productPredicate(v) && stateCondition && extraCondition;
    }
    this.tabSelectionChanged();
  }
}
