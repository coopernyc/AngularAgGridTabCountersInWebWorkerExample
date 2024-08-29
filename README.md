# AngularBlotterWebWorkerExample

This is an example project demonstrating performance optimization concepts when dealing with high frequency high volume updates in SPA Singe-page Application such as: distinct throttling, lazy sampling, transactional delta updates and offload heavy calculations into a separate thread with Web Workers.

## Task
Optimize Blotter (order grid in financial applications) for consistent, responsive and lighting speed rendering on massive data updates. Given groups of related filter tabs, allowing to quick filter displayed data in the Blotter and showing total order counts for a specific condition in a filter tab.

![Alt Blotter](./Blotter-001.png)

Here are three groups of filter tabs:
1. Product type group, mutual exclusive selection;
2. Order state group, multiple selection. Counters reflect Product type group selection;
3. Extra mixed selection group, e.g. "Voice" and "Electronic" filters are mutual exclusive, but Basket filter tab is not. Order counts reflect product and state groups selections.

Below is an example of selecting Commodity electronic and basket orders in Cancelled or Failed state

![Alt Blotter with filter selection](./Blotter-002.png)

Example application generates 10000 random orders (new and updates by OrderId) with high random frequency. 

Application receives order updates, it throttles update order events and picks only most recent order updates by specified interval, then it sends resulting small batch of updates for delta transaction update/rendering to the Blotter grid and to the spawned Web Worker which performs order counts calculation in a separate thread. 

Worker keeps it's tab/orders data in sync by receiving tab configuration /selection changes and batches of order updates from main application. Since data is copied between thread it is important to maintain small batches to minimize costs of serialization/deserialization between threads.
