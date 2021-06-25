import { Injectable } from '@angular/core';

declare let gtag: Function;

@Injectable({
  providedIn: 'root'
})
export class GoogleAnalyticsService {

  constructor() {
    gtag('config', 'UA-40216178-2');
  }

  public eventEmitter(
    eventName: string,
    eventCategory: string,
    eventAction: string,
    eventLabel: string = null,
    eventValue: number = null ) {
         gtag('event', eventName, {
                 eventCategory: eventCategory,
                 eventAction: eventAction,
                 eventLabel: eventLabel,
                 eventValue: eventValue
               } );
    }
}

/*
Attribution: https://medium.com/@PurpleGreenLemon/how-to-properly-add-google-analytics-tracking-to-your-angular-web-app-bc7750713c9e
Usage:

  eventName: 'Select'
  eventCategory: 'AppFunction'
  eventLabel: 'Layer', 'Overlay', 'Site', 'Options', 'Help'
  eventAction: 'click'
  eventValue: Current Overlay or Site Name

  this.eventEmitter('Select',
              'AppFunction', 'Layer', 'click', `${this.selectedOverlayProperties.Overlay}`);
*/