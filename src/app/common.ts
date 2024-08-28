import {
    bufferTime,
    concat,
    defer, exhaustMap,
    filter, finalize,
    map,
    MonoTypeOperatorFunction, Observable,
    ObservableInput,
    pipe,
    ReplaySubject, takeUntil, takeWhile, tap
} from "rxjs";

export enum OrderStateEnum {
    Active = "Active",
    Cancelled = "Cancelled",
    Failed = "Failed",
    Filled = "Filled"
}

export enum CurrencyEnum {
    USD = "USD",
    CAD = "CAD",
    JPY = "JPY",
    EUR = "EUR"
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
    ProductType: ProductTypeEnum
}

export interface IFilterTab {
    id: string;
    headerName: string;
    counter?: number;
    predicate: (v: any) => boolean;
    selected: boolean;
}

export const distinctThrottle = (throttleTime: number, keySelector: (value :any) => any) => pipe(
    bufferTime(throttleTime),
    filter(buf => !!buf.length),
    map(buf => {
        return [...buf
            .reduce((acc: Map<any, any>, cur) => {
                acc.set(keySelector(cur), cur);
                return acc;
            }, new Map<any, any>())
            .values()]
    })
);

export const TAB_COUNTERS_CALC_INTERVAL = 1000;

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


export function productTypePredicate(order: IOrder, productType: ProductTypeEnum): boolean {
    return order.ProductType === productType;
}

export function statePredicate(order: IOrder, state: OrderStateEnum): boolean {
    return order.State === state;
}

export enum WorkerTopic {
  ModelUpdate
}
