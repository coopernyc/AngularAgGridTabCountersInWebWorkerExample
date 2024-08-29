import {IModelTransaction, Model} from "./model";
import {GridApi} from "ag-grid-community";

export class GridModel<K, T> extends Model<K, T> {

  public gridApi?: GridApi;

  constructor(factory: (value: T) => K) {
    super(factory);
  }

  public updateGrid(v: T | T[]): void {
    if (this.gridApi) {
      const trans: IModelTransaction<T> = this.update(v);
      this.gridApi!.applyTransaction(trans);
    } else {
      throw new Error(`Grid is not ready`);
    }
  }

  override get predicate(): (value: T, key: K) => boolean {
    return super.predicate;
  }

  override set predicate(filter: (value: T, key: K) => boolean) {
    super.predicate = filter;
    if (this.gridApi) {
      this.gridApi.setGridOption('rowData', this.values);
    }
  }
}
