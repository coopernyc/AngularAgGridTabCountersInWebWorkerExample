import {Map, OrderedMap} from "immutable";
import _ from "lodash";

export interface IModelTransaction<T> {
  add?: T[];
  update?: T[];
  remove?: T[];
}

export class Model<K, T> {

  protected _fullModel: OrderedMap<K, T> = OrderedMap<K, T>();
  protected _model: OrderedMap<K, T> = OrderedMap<K, T>();
  protected _predicate: (value: T, key: K) => boolean = () => true;
  protected readonly keyFactory: (value: T) => K;

  constructor(factory: (value: T) => K) {
    this.keyFactory = factory;
  }

  public set predicate(filter: (value: T, key: K) => boolean) {
    this._predicate = filter;
    this._model = this._fullModel.filter(this.predicate);
  }

  public get predicate() {
    return this._predicate;
  }

  public get model(): OrderedMap<K, T> {
    return this._model;
  }

  public get fullModel(): OrderedMap<K, T> {
    return this._fullModel;
  }

  public get(key: K): T | undefined {
    return this.model.get(key);
  }

  public get values(): T[] {
    return this.model.valueSeq().toArray();
  }

  public update(value: T | T[]): IModelTransaction<T> {
    if (!Array.isArray(value)) {
      value = [value];
    }
    const result: IModelTransaction<T> = {};
    let [mUpdate, mAdd, mRemove] = [Map<K, T>(), Map<K, T>(), Map<K, T>()];
    mAdd = mAdd.withMutations((add) => {
      mUpdate = mUpdate.withMutations((update) => {
        mRemove = mRemove.withMutations((remove) => {
          this._fullModel = this.fullModel.withMutations((fm) => {
            this._model = this.model.withMutations((m) => {
              value.forEach((v) => {
                const key = this.keyFactory(v);
                fm.set(key, v);
                if (this.get(key)) { // filtered model
                  if (!_.isFunction(this.predicate)) {
                    console.log('ERROR');
                  }
                  if (this.predicate(v, key)) {
                    update.set(key, v);
                    m.set(key, v);
                  } else {
                    remove.set(key, v);
                    m.delete(key);
                  }
                } else if (this._predicate(v, key)) {
                  add.set(key, v);
                  m.set(key, v);
                }
              });
            });
          });
        });
      });
    });
    if (mAdd.count()) {
      result.add = mAdd.valueSeq().toArray();
    }
    if (mUpdate.count()) {
      result.update = mUpdate.valueSeq().toArray();
    }
    if (mRemove.count()) {
      result.remove = mRemove.valueSeq().toArray();
    }
    return result;
  }
}
