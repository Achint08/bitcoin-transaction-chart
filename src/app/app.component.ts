import { Component, ChangeDetectorRef, OnInit, OnDestroy } from '@angular/core';
import * as CanvasJS from './canvasjs.min';
import { Observable, Subject } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy  {
  title = 'bitcoin-visualization';
  public display = false;
  private queue: any[] = [];
  public connected: Observable<boolean>;
  public subject = new Subject();
  private ws: WebSocket;
  public status = 'Disconnected';
  public chart: any;

  ngOnInit() {
    this.chart = new CanvasJS.Chart('chartContainer', {
      exportEnabled: true,
      axisX: {
        title: 'Time (Indian Standard Time)'
      },
      axisY: {
        title: 'Transactions Value',
        labelAngle: -60,
      },
      title: {
        text: 'Bitcoin Transactions'
      },
      data: [{
        type: 'line',
        dataPoints : this.queue,
      }]
    });
  }

  constructor(private changeDetectorRef: ChangeDetectorRef ) {
    this.subscribeToEvents();
    const j = setInterval(() => {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.status = 'Connected';
        this.connect();
        clearInterval(j);
      }
    }, 5000);
  }

  private subscribeToEvents() {
    this.subject.next(false);
    this.subject.subscribe((data) => {
      if (data) {
        this.subscribeToData();
      }
    });
    this.ws = new WebSocket('wss://ws.blockchain.info/inv');
    this.status = 'Connecting...';
    this.ws.onmessage =  ((event) => {
      const data = JSON.parse(event.data);
      if (data.op === 'pong') {
        this.subject.next(true);
      } else {
        const d = new Date(0);
        d.setUTCSeconds(data.x.time);
        const timeString = d.toISOString().substr(11, 8);
        if (data.x.out[0].value > 1) {
          if (this.queue && this.queue.length === 10) {
            this.queue.shift();
          }
          this.queue.push({
            label: timeString,
            x: d,
            y: data.x.out[0].value
          });
        }
        if (this.queue.length === 9) {
          console.log(data.x.time);
          console.log(this.queue);
        }
        this.chart.render();
      }
      this.changeDetectorRef.detectChanges();

    });
  }

  private connect() {
    this.ws.send('{"op": "ping"}');

  }

  private subscribeToData() {
    this.ws.send('{"op": "unconfirmed_sub"}');
  }

  private unsubscribeToData() {
    this.ws.send('{"op": "unconfirmed_unsub"}');
  }

  ngOnDestroy() {
    this.unsubscribeToData();
  }

}
