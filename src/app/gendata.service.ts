import {Injectable} from "@angular/core";
import {concatMap, delay, Observable, of, range} from "rxjs";
import {CurrencyEnum, IOrder, OrderStateEnum, ProductTypeEnum} from "./common";
import _ from "lodash";

@Injectable({
  providedIn: 'root'
})
export class GenDataService {

  public readonly publish$: Observable<IOrder>;

  constructor() {

    this.publish$ = range(1, 10000).pipe(
      concatMap(() => {
        const order: IOrder = {
          OrderId: 'ORDER-' + _.padStart(Math.floor(Math.random() * 101).toString(), 5, '0'),
          Price: Math.random() * 100,
          State: _.sample(Object.values(OrderStateEnum)) as OrderStateEnum,
          Currency: _.sample(Object.values(CurrencyEnum)) as CurrencyEnum,
          ProductType: _.sample(Object.values(ProductTypeEnum)) as ProductTypeEnum
        };
        return of(order).pipe(
          delay(10 + (Math.random() * 200))
        );
      })
    );
  }

}
