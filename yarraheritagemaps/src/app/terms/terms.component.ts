import { Component } from '@angular/core';
import { GoogleAnalyticsService } from '../google-analytics.service';

declare let gtag: Function;
@Component({
  selector: 'app-terms',
  templateUrl: './terms.component.html',
  styleUrls: ['./terms.component.scss']
})
export class TermsComponent {

  constructor(
    private _gtagService: GoogleAnalyticsService
  ) {
    gtag('config', 'UA-40216178-2');
  }

}

