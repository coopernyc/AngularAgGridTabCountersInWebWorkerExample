import {bufferTime, filter, map, pipe} from "rxjs";

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
    Fx = "FX",
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

export function productTypePredicate(order: IOrder, productType: ProductTypeEnum): boolean {
    return order.ProductType === productType;
}

export function statePredicate(order: IOrder, state: OrderStateEnum): boolean {
    return order.State === state;
}
