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
    eventName: string,  // a.k.a action
    eventCategory: string,
    eventLabel: string = null,
    eventValue: number = 0 ) {
         gtag('event', eventName, {
              'event_category': eventCategory,
              'event_label': eventLabel,
              'value': eventValue
               } );
    }
}

/*
Attribution: https://medium.com/@PurpleGreenLemon/how-to-properly-add-google-analytics-tracking-to-your-angular-web-app-bc7750713c9e
Usage:

gtag('event', <action>, {
  'event_category': <category>,
  'event_label': <label>,
  'value': <value>
});

Standard Event Names:
 - select_content
 - view_item
 - view_item_list
 - view_search_results

Add parameter  - non_interaction

Name	Type	Default Value	Description
<action>	string		The value that will appear as the event action in Google Analytics Event reports.
<category>	string	"(not set)"	The category of the event.
<label>	string	"(not set)"	The label of the event.
<value>	number		A non-negative integer that will appear as the event value.
*/