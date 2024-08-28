import {IOrder, lazySample, TAB_COUNTERS_CALC_INTERVAL, WorkerTopic} from "./common";
import {Model} from "./model";
import {Subject, timer} from "rxjs";

class TabCounterWorker {

  private readonly model = new Model<string, IOrder>((value: IOrder) => value.OrderId);
  private readonly source$: Subject<void> = new Subject<void>();

  public run() {

    this.source$.pipe(
      lazySample(() => timer(0, TAB_COUNTERS_CALC_INTERVAL))
    ).subscribe(() => {
        const result = this.calcTabCounters();
        postMessage(result);
    });

    addEventListener('message', ({data}) => {
      const payload = data.value;
      switch (data.topic) {
        case WorkerTopic.ModelUpdate:
          switch (payload.operator) {
            case "update":
              this.model.update(payload.data);
              break;
          }
          this.source$.next();
          break;
      }
    });

  }

  private calcTabCounters(): any {

  }
}

(new TabCounterWorker()).run();
