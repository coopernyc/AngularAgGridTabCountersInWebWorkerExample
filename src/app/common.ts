import {
  bufferTime,
  concat,
  defer, exhaustMap,
  filter, finalize,
  map,
  MonoTypeOperatorFunction, Observable, OperatorFunction,
  pipe,
  ReplaySubject, takeUntil, takeWhile, tap
} from "rxjs";
import _ from "lodash";

export enum OrderStateEnum {
  Trading = "Trading",
  Cancelled = "Cancelled",
  Failed = "Failed",
  Filled = "Filled"
}

export enum CurrencyEnum {
  USD = "USD",
  CAD = "CAD",
  JPY = "JPY",
  EUR = "EUR",
  RUB = "RUB",
  CNY = "CNY"
}

export enum ProductTypeEnum {
  Equity = "Equity",
  FX = "FX",
  Commodity = "Commodity",
  Rate = "Rate",
  Credit = "Credit"
}

export interface IOrder {
  OrderId: string,
  Price: number,
  State: OrderStateEnum,
  Currency: CurrencyEnum,
  ProductType: ProductTypeEnum,
  Quantity: number,
  Side: ('Buy' | 'Sell'),
  OrderType: ('Voice' | 'Electronic'),
  BasketId?: string,
  OrderTime: string,
  Trader: string,
  Broker: string
}

export interface IFilterTab {
  id: string;
  headerName: string;
  counter?: number;
  critical?: boolean;
  predicate: (v: any) => boolean;
  selected: boolean;
}

export const TAB_COUNTERS_CALC_INTERVAL = 1000;

export function distinctThrottle<K, T>(
  throttleTime: number,
  keySelector: (value: T) => K
): OperatorFunction<T, T[]> {
  return (source) => defer(() => {
    return source.pipe(
      bufferTime(throttleTime),
      filter(buf => !!buf.length),
      map(buf => {
        return [...buf
          .reduce((acc: Map<K, T>, cur: T) => {
            acc.set(keySelector(cur), cur);
            return acc;
          }, new Map<K, T>())
          .values()];
      })
    );
  });
}

export function lazySample<T>(
  notifierSelector: (value: T | null) => Observable<any>,
  includeFinal: boolean = true
): MonoTypeOperatorFunction<T | null> {
  return (source) =>
    defer(() => {
      const finalValue = new ReplaySubject<T | null>();
      let hasValue = false;
      let lastValue: T | null = null;

      return concat(
        source.pipe(
          tap((val) => {
            lastValue = val;
            hasValue = true;
          }),
          finalize(() => {
            finalValue.next(lastValue);
            finalValue.complete();
          }),
          exhaustMap((value) =>
            notifierSelector(value).pipe(
              takeUntil(finalValue),
              takeWhile(() => hasValue),
              map(() => {
                hasValue = false;
                return lastValue;
              })
            )
          )
        ),
        finalValue.pipe(filter(() => hasValue && includeFinal))
      );
    });
}


export function productTypePredicate(order: IOrder, productType: string): boolean {
  if (productType === "All") {
    return true;
  }
  return order.ProductType === productType;
}

export function statePredicate(order: IOrder, state: string): boolean {
  return order.State === state;
}

export function voicePredicate(order: IOrder): boolean {
  return order.OrderType === 'Voice';
}

export function electronicPredicate(order: IOrder): boolean {
  return order.OrderType === 'Electronic';
}

export function basketPredicate(order: IOrder): boolean {
  return !_.isEmpty(order.BasketId);
}

export enum WorkerTopic {
  Setup,
  ModelUpdate,
  TabSelectedChange
}
