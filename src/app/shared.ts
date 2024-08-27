import {OrderedMap} from "immutable";

export class Model<K, T> {

  private cache: OrderedMap<K, T> = OrderedMap<K, T>();
  private readonly keyFactory: (value: T) => K;

  constructor(factory: (value: T) => K) {
    this.keyFactory = factory;
  }

  public get(key: K): T | undefined {
    return this.model.get(key);
  }

  public get values(): T[] {
    return this.model.valueSeq().toArray();
  }

  public update(value: T | T[]): void {
    if (!Array.isArray(value)) {
      value = [value];
    }
    this.cache = value.reduce((acc, cur) => {
      acc = acc.set(this.keyFactory(cur), cur);
      return acc;
    }, OrderedMap<K, T>())
  }

  public predicate: (value: T, key: K) => boolean = () => true;

  public get model(): OrderedMap<K, T> {
    return this.cache.filter(this.predicate);
  }

  public filter(predicate: (value: T, key: K) => boolean = () => true): T[] {
    return this.model.filter(predicate).valueSeq().toArray();
  }
}
