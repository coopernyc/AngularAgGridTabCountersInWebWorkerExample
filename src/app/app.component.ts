import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {Model} from "./shared";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'AngularAgGridTabCountersWebWorkerExample';


  private readonly model: Model<string, any> = new Model<string, any>((value: any) => value.OrderId);

  constructor() {

    this.model.update([
      {
        OrderId: '0001',
        ProductType: 'Equity',
        State: 'Active',
        Currency: 'USD',
        Price: 45.89
      },
      {
        OrderId: '0002',
        ProductType: 'FX',
        State: 'Cancelled',
        Currency: 'USD',
        Price: 50.45
      }
    ]);

    console.log(this.model.values);

  }

}
