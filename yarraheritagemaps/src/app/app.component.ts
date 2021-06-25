/**
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Component, ViewContainerRef } from '@angular/core';
import { Router, NavigationEnd} from '@angular/router';
import { GoogleTagManagerService } from 'angular-google-tag-manager';
import { GoogleAnalyticsService } from './google-analytics.service';
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  readonly title = 'Yarra Heritage Maps';

  constructor(
    public viewContainerRef: ViewContainerRef,
    public gtmService: GoogleTagManagerService,
    private _gtagService: GoogleAnalyticsService,
    public router: Router) {
      this.router.events.subscribe(event => {
        if (event instanceof NavigationEnd) {
          this._gtagService.eventEmitter(
            'view-content', 'page-path', event.urlAfterRedirects);
         }
      });
    }
}



