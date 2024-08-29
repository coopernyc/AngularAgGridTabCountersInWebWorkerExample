import {
  basketPredicate,
  electronicPredicate,
  IFilterTab,
  IOrder,
  lazySample,
  productTypePredicate,
  statePredicate,
  TAB_COUNTERS_CALC_INTERVAL,
  voicePredicate,
  WorkerTopic
} from "./common";
import {Model} from "./model";
import {Subject, timer} from "rxjs";
import _ from "lodash";

class TabCounterWorker {

  private readonly model = new Model<string, IOrder>((value: IOrder) => value.OrderId);
  private readonly source$: Subject<void> = new Subject<void>();

  private productTypeTabsModel: Model<string, IFilterTab> = new Model<string, IFilterTab>((tab: IFilterTab) => tab.id);
  private stateTabsModel: Model<string, IFilterTab> = new Model<string, IFilterTab>((tab: IFilterTab) => tab.id);
  private extraTabsModel: Model<string, IFilterTab> = new Model<string, IFilterTab>((tab: IFilterTab) => tab.id);

  public run() {
    console.log("Worker started");
    this.source$.pipe(
      lazySample(() => timer(0, TAB_COUNTERS_CALC_INTERVAL))
    ).subscribe(() => {
      const result = this.calcTabCounters();
      postMessage(result);
    });

    addEventListener('message', ({data}) => {
      const payload = data.value;
      switch (data.topic) {
        case WorkerTopic.Common:
          console.log("Worker got Common data");
          payload.product_type_tabs = payload.product_type_tabs.map((tab: IFilterTab) => {
            tab.predicate = (order: IOrder) => productTypePredicate(order, tab.id);
            return tab;
          });
          this.productTypeTabsModel.update(payload.product_type_tabs);
          payload.state_tabs = payload.state_tabs.map((tab: IFilterTab) => {
            tab.predicate = (order: IOrder) => statePredicate(order, tab.id);
            return tab;
          });
          this.stateTabsModel.update(payload.state_tabs);
          payload.extra_tabs = payload.extra_tabs.map((tab: IFilterTab) => {
            tab.predicate = (order: IOrder) => {
              switch (tab.id) {
                case 'Voice':
                  return voicePredicate(order);
                case 'Electronic':
                  return electronicPredicate(order);
                case 'Basket':
                  return basketPredicate(order);
              }
              return true;
            };
            return tab;
          });
          this.extraTabsModel.update(payload.extra_tabs);
          break;
        case WorkerTopic.ModelUpdate:
          switch (payload.operator) {
            case "update":
              this.model.update(payload.data);
              break;
          }
          this.source$.next();
          break;
        case WorkerTopic.TabSelectedChange:
          console.log(`Worker got Tab selection update`);

          let tabs: IFilterTab[] = this.productTypeTabsModel.values.map((tab: IFilterTab) => {
            tab.selected = tab.id === payload.product_type_tab;
            return tab;
          });
          if (tabs.length) {
            this.productTypeTabsModel.update(tabs);
          }
          tabs = this.stateTabsModel.values.map((tab: IFilterTab) => {
            tab.selected = _.includes(payload.state_tabs || [], tab.id);
            return tab;
          });
          if (tabs.length) {
            this.stateTabsModel.update(tabs);
          }
          this.source$.next();
          break;
      }
    });
  }

  private calcTabCounters(): any {
    console.log('Worker is calculating counters');
    const result: any = {};
    const productTypeSelectedTab: IFilterTab | undefined = this.productTypeTabsModel.model.find(x => x.selected)!;
    this.productTypeTabsModel.model.forEach((tab: IFilterTab) => {
      result[tab.id] = this.model.fullModel.filter((order: IOrder) => tab.predicate(order)).count();
    });
    this.stateTabsModel.model.forEach((tab: IFilterTab) => {
      result[tab.id] = this.model.fullModel.filter((order: IOrder) => productTypeSelectedTab.predicate(order) && tab.predicate(order)).count();
    });

    const statesSelected = this.stateTabsModel.model.filter(x => x.selected);

    this.extraTabsModel.model.forEach((tab: IFilterTab) => {
      result[tab.id] = this.model.fullModel.filter((order: IOrder) => {
        let stateCondition = statesSelected.count() === 0;
        statesSelected.forEach((stab: IFilterTab) => {
          stateCondition = stateCondition || stab.predicate(order);
        })
        return productTypeSelectedTab.predicate(order) && stateCondition && tab.predicate(order);
      }).count();
    });


    console.log(result);
    return result;
  }
}

(new TabCounterWorker()).run();
