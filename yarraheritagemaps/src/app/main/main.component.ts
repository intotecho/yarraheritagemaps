/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 */
import { Component,
         Renderer2,
         ChangeDetectorRef,
         NgZone,
         OnInit,
         AfterViewInit,
         OnDestroy,
         ViewChild,
         ChangeDetectionStrategy
      } from '@angular/core';
import { FormBuilder, FormGroup, FormControl, FormArray, Validators } from '@angular/forms';
import { MatTableDataSource, MatSnackBar, MatSlideToggleChange } from '@angular/material';
import { MediaMatcher } from '@angular/cdk/layout';
import { StepperSelectionEvent } from '@angular/cdk/stepper';
import { Subject } from 'rxjs/Subject';
import { Subscription } from 'rxjs/Subscription';
import { SplitComponent, SplitAreaDirective } from 'angular-split';
import { GoogleAnalyticsService } from './../google-analytics.service';
import { StyleProps, StyleRule, LayerStyles } from '../services/styles.service';
import { OverlaysAPIService,  OverlaysResponse, ColumnStat } from '../services/overlays-api.service';
import { AppSettings } from '../services/appsettings.service';
import { LayerDescription } from '../services/layers-info-service';
import { HeritageSiteInfo } from './panels/heritage-site-info/heritage-site-info';
import { GoogleTagManagerService } from 'angular-google-tag-manager';
import 'rxjs/add/operator/debounceTime.js';
import 'rxjs/add/operator/map.js';


import {
  Step,
  HERITAGE_SITE_QUERY,
  OVERLAYS_QUERY,
  HERITAGE_SITE_FILL_COLOR_HERITAGESTATUS,
  HERITAGE_SITE_FILL_COLOR_EARLIESTDECADE,
  OVERLAY_FILL_COLOR,
  OVERLAY_FILL_OPACITY,
  OVERLAY_STROKE_COLOR,
  OVERLAY_STROKE_OPACITY,
  HERITAGE_SITE_FILL_OPACITY,
  MAX_RESULTS_PREVIEW,
  HERITAGE_SITE_CIRCLE_RADIUS,
  HERITAGE_SITE_CIRCLE_RADIUS_FIXED,
  
  HERITAGE_SITE_STROKE_COLOR,
  PLANNING_APPS_QUERY,
  PLANNING_APP_STROKE_COLOR,
} from '../app.constants';


import {
  OverlayProperties
} from './panels/overlays-properties';

import {
  SelectMMBWOverlay, MMBWMapsLibrary
} from '../services/select-MMBWOverlay';
import { NavigationEnd, Router } from '@angular/router';
import { map } from 'rxjs-compat/operator/map';


const DEBOUNCE_MS = 1000;

@Component({
  selector: 'app-main',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.css', './angular-split.scss' ],
  providers: [SplitComponent, SplitAreaDirective, OverlaysAPIService]
})
export class MainComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('split', {static: false}) split: SplitComponent;
  @ViewChild('area1', {static: false}) area1: SplitAreaDirective;
  @ViewChild('area2', {static: false}) area2: SplitAreaDirective;

  shadingSchemes: string[] = ['Heritage Status', 'Established Date'];
  hidePropertySubject: Subject<any> = new Subject();
  splitterSizeSubject: Subject<any> = new Subject();
  readonly title = 'Heritage Maps';
  readonly StyleProps = StyleProps;
  events: string[] = [];
  sidenavOpened = true;
  advancedControlsOpened: boolean;
  _loadSitesForPreviousOverlay: boolean;
  // GCP session data
  isSignedIn = true;
  user: Object;

  // private _layersInfo: Array<LayerDescription>;
  selectedLayersInfo: Array<LayerDescription> = [];

  overlayProperties: OverlayProperties = new OverlayProperties(null); // hover on overlay - for desktop
  selectedOverlayProperties: OverlayProperties = new OverlayProperties(null);
  matchingOverlays: Array<OverlayProperties> = [];

  selectedHeritageSiteInfo: HeritageSiteInfo = new HeritageSiteInfo(null);
  highlightedHeritageSiteInfo: HeritageSiteInfo = new HeritageSiteInfo(null);

  mmbwMaps: Array<SelectMMBWOverlay> = MMBWMapsLibrary;
  selectedMmbwMaps: Array<SelectMMBWOverlay> = [];
  // Form groups
  dataFormGroup: FormGroup;
  schemaFormGroup: FormGroup;
  stylesFormGroup: FormGroup;

  // Overlays response data
  columns: Array<Object>;
  columnNames: Array<string>;
  bytesProcessed: Number = 0;
  lintMessage = '';
  public pending = true;
  rows: Array<Object>;
  data: MatTableDataSource<Object>;
  stats: Map<String, ColumnStat> = new Map();
  mapsLib = [];
  // UI state
  stepIndex: Number = 0;
  
  // Current style rules
  // styles: Array<StyleRule> = [];
  styles: LayerStyles = new LayerStyles();

  // Angular-Split
  direction = 'vertical';
  minTitleHeight: number;

  // CodeMirror configuration
  readonly cmConfig = {
    indentWithTabs: true,
    smartIndent: true,
    lineNumbers: true,
    lineWrapping: true
  };
  readonly cmDebouncer: Subject<string> = new Subject();
  cmDebouncerSub: Subscription;

  constructor(
    private dataService:  OverlaysAPIService,
    private gtmService: GoogleTagManagerService,
    private _gtagService: GoogleAnalyticsService,
    private _formBuilder: FormBuilder,
    private _renderer: Renderer2,
    private _snackbar: MatSnackBar,
    private _changeDetectorRef: ChangeDetectorRef,
    private _media: MediaMatcher,
    private router: Router,
    private _ngZone: NgZone) {
  }

  ngOnInit() {
    this.columns = [];
    this.columnNames = [];
    this.rows = [];

    this.gtmService.pushTag({
      event: 'app-initialised',
      data: 'none',
    });

    this.router.events.forEach(item => {
      if (item instanceof NavigationEnd) {
        const gtmTag = {
          event: 'page',
          pageName: item.url
        };

        this.gtmService.pushTag(gtmTag);
      }
    });

    // Data form group
    const appSettings: AppSettings = new AppSettings();

    this.sidenavOpened = appSettings.advancedControlsOpened; // leave opened when advanced.
    this.advancedControlsOpened = appSettings.advancedControlsOpened; // leave opened when advanced.
    this._loadSitesForPreviousOverlay = appSettings.loadSitesForPreviousOverlay;

    const shadingSchemesOptions = appSettings.selectedShadingScheme;
    const browserHeight = window.innerHeight;
    const isHandheld = this._media.matchMedia('(max-width: 480px)');
    const minHeightPix = (isHandheld) ? 48 : 33; // Add dragger height which varies by device type?
    if ( browserHeight  > 0) {
      this.minTitleHeight = (minHeightPix * 100 / browserHeight );
    }

    this.dataFormGroup = this._formBuilder.group({
      overlayId: ['HO0'],
      selectedMMBWIds: [],
      shadingSchemesOptions: [shadingSchemesOptions]
    });

    // Schema form group
    this.schemaFormGroup = this._formBuilder.group({
      geoColumn: ['bdry'],
    });

    this.dataFormGroup.controls.overlayId.valueChanges.debounceTime(200).subscribe(() => {
      const overlayId = this.dataFormGroup.controls.overlayId.value;
      const row = this.matchingOverlays.find( o => o.Overlay = overlayId);
      if (row) {
        if (this.selectedOverlayProperties) {
          this.showMessage(`Loading Heritage Sites for Overlay ${this.selectedOverlayProperties.Overlay}`, 3000);
          this.schemaFormGroup.patchValue({ sql: HERITAGE_SITE_QUERY });
          this.queryHeritageSites(this.selectedOverlayProperties.Overlay); // kick off initial query to load the overlays
          }
        } else {
        console.log('Overlay not found in form data!');
      }
      this.sidenavOpened = this.advancedControlsOpened; // leave opened when advanced.
    });

    this.dataFormGroup.controls.selectedMMBWIds.valueChanges.debounceTime(200).subscribe(() => {
      this.selectedMmbwMaps = this.mmbwMaps.filter((mmbwMap) => {
         return  this.dataFormGroup.controls.selectedMMBWIds.value.includes(mmbwMap.MMBWmapId);
      });
      console.log(this.selectedMmbwMaps);
      this.sidenavOpened = this.advancedControlsOpened; // leave opened when advanced.

      this._gtagService
      .eventEmitter(
          'view-item',
          'historic-map',
          `${this.selectedMmbwMaps.map( name => name.MMBWmapId) }`,
          this.selectedMmbwMaps.length);
    });

    this.dataFormGroup.controls.shadingSchemesOptions.valueChanges.debounceTime(200).subscribe(() => {
      const currentShadingSchemesOptions = this.dataFormGroup.controls.shadingSchemesOptions.value;
      if (currentShadingSchemesOptions) {
        const currentAppSettings: AppSettings = new AppSettings();
        currentAppSettings.selectedShadingScheme = currentShadingSchemesOptions;
        this.loadHeritageShadingScheme();
        this.updateStyles('vhdplaceid');
        this.showMessage(`Shading sites by ${currentAppSettings.selectedShadingScheme}`, 2000);
        this.gtmService.pushTag({
          event: 'overlay',
          type: 'change-view',
          data: 'shading',
          value: `${currentShadingSchemesOptions}`
        });
        this._gtagService
          .eventEmitter('view-item',
                        'shading',
                        `${currentShadingSchemesOptions}`, 0);
        // this.sidenavOpened = this.advancedControlsOpened; // leave opened to show new legend.
      }
    });

    // Style rules form group
    const stylesGroupMap = {};
    StyleProps.forEach((prop) => stylesGroupMap[prop.name] = this.createStyleFormGroup());
    this.stylesFormGroup = this._formBuilder.group(stylesGroupMap);
    this.stylesFormGroup.valueChanges.debounceTime(500).subscribe(() => this.updateStyles(''));
  }

  ngAfterViewInit() {
    const appSettings: AppSettings = new AppSettings();
    const splitSizes = [appSettings.area1, appSettings.area2];
    if (splitSizes[1] < this.minTitleHeight ) {
      splitSizes[0] = 100 - this.minTitleHeight;
      splitSizes[1] = this.minTitleHeight;
    }
    this.split.setVisibleAreaSizes(splitSizes);
    this.splitterSizeSubject.next(splitSizes);
    this.queryOverlays('initial');
  }

  ngOnDestroy() {
    this.cmDebouncerSub.unsubscribe();
  }

  islayerSelected(layerInfo: Array<LayerDescription>, name: string): boolean {
    return layerInfo.find((layer) => {
      return layer.name === name;
    }) ?
    true :
    false;
  }

  startSpinner() {
    this.pending = true;
    this._changeDetectorRef.detectChanges();
  }

  stopSpinner() {
    this.pending = false;
    this._changeDetectorRef.detectChanges();
  }

  handleSelectedLayersChanged(event) {
    const appSettings: AppSettings = new AppSettings();
    if (this.selectedLayersInfo !== event) {
      this.sidenavOpened = this.advancedControlsOpened; // leave opened when advanced.
    }
    this.selectedLayersInfo = event;
    if (this.islayerSelected(this.selectedLayersInfo, 'Planning')) {
        this.queryPlanningApplications(this.selectedOverlayProperties.Overlay);
        if (this.selectedOverlayProperties.Overlay.length > 0 ) {
          this.showMessage(`Loading Planning Applications for Overlay ${this.selectedOverlayProperties.Overlay}`, 5000);
        } else {
          this.showMessage(`Fist Select an Overlay`, 5000);
        }
    }
    this._changeDetectorRef.detectChanges();

  }

  handleMapOverlayHighlighted(event) {
    this.overlayProperties = event;
  }

  handleMapOverlaySelected(event) {
    this.overlayProperties = event;
    this.selectedOverlayProperties = event;
    this.dataFormGroup.patchValue({overlayId: this.selectedOverlayProperties.Overlay });
    this.sidenavOpened = this.advancedControlsOpened; // leave opened when advanced.

    this.gtmService.pushTag({
        event: 'overlay',
        type:  'selected',
        data:  'overlayId',
        value: `${this.selectedOverlayProperties.Overlay}`
      });
    this._gtagService
      .eventEmitter('select-content',
                    'overlay',
                    `${this.selectedOverlayProperties.Overlay}`);
      }

  handleMapHeritageSiteHighlighted(event) {
    this.highlightedHeritageSiteInfo = event;
    if (event) {
      this.overlayProperties = this.selectedOverlayProperties;
    }
  }

  handleMapHeritageSiteSelected(event) {
    this.highlightedHeritageSiteInfo = event;
    this.selectedHeritageSiteInfo = event;
    localStorage.setItem('selectedProperty',  JSON.stringify(this.selectedHeritageSiteInfo));

    this.gtmService.pushTag({
      event: 'heritageSite1',
      type:  'selected',
      data:  'siteAddress',
      value: `${this.selectedHeritageSiteInfo.EZI_ADD}`
    });
    this._gtagService
    .eventEmitter('select-content',
                  'heritage-site',
                  `${this.selectedHeritageSiteInfo.EZI_ADD}`);

  }

  onStepperChange(e: StepperSelectionEvent) {
    this.stepIndex = e.selectedIndex;
    this.updateStyles('');
    gtag('event', 'step', { event_label: `step ${this.stepIndex}` });
  }

  getHeritageShadingFill() {
    const appSettings: AppSettings = new AppSettings();
    const heritageFill = appSettings.selectedShadingScheme === 'Heritage Status' ?
          HERITAGE_SITE_FILL_COLOR_HERITAGESTATUS :
          HERITAGE_SITE_FILL_COLOR_EARLIESTDECADE;
    return heritageFill;
   }

   loadHeritageShadingScheme() {
    const opaqueStyle = {isComputed: false, value: 0.3};
    const heritageOpacity = opaqueStyle; // HERITAGE_SITE_FILL_OPACITY;
    const heritageFill = this.getHeritageShadingFill();

    this.setNumStops(<FormGroup>this.stylesFormGroup.controls.fillColor, heritageFill.domain.length);
    this.stylesFormGroup.controls.fillOpacity.patchValue(heritageOpacity);
    this.stylesFormGroup.controls.fillColor.patchValue(heritageFill);
    this.stylesFormGroup.controls.circleRadius.patchValue(HERITAGE_SITE_CIRCLE_RADIUS_FIXED);
    this.schemaFormGroup.patchValue({ geoColumn: 'bdry'});
    // this.stylesFormGroup.controls.strokeColor.patchValue(HERITAGE_SITE_STROKE_COLOR);
    // this.stylesFormGroup.controls.strokeColor.patchValue(PLANNING_APP_STROKE_COLOR);
  }

  queryHeritageSites(overlayId: string = null) {
    if (this.pending) { return; }
    this.startSpinner();

    this.dataService.getOverlay(overlayId).subscribe(
      response =>
    {
      this.stopSpinner();
      if (response.length === 0 ) {
        this.showMessage(`No heritage properties within Overlay ${this.selectedOverlayProperties.Overlay}`, 5000);
        if (this.selectedOverlayProperties.IncludedInVHR === true) {
        }
      } else {
        let msg = `Showing ${response.length} heritage properties within Overlay ${this.selectedOverlayProperties.Overlay}`;
          if (response.length > 300) {
            msg = msg + 'Rendering may take a little while';
            this.showMessage(msg, 8000);
          } else {
            this.showMessage(msg, 5000);
          }
        }
        //let rx = new Observable(function* () {
        //   yield false;
        //  } 
        //)
        //}).subscribe();
        this._changeDetectorRef.detectChanges();
        this.columns = Object.keys(response[0]);
        this.rows = response;
        //const heritageFill = this.getHeritageShadingFill();
        //const opaqueStyle = {isComputed: false, value: 0.3};
         // const heritageOpacity = opaqueStyle; // HERITAGE_SITE_FILL_OPACITY;
      

      this.gtmService.pushTag({
        event: 'overlay',
        type:  'select-item',
        data:  `'${response.length} sites`,
        value: `${this.selectedOverlayProperties.Overlay}`      });
      this._gtagService
        .eventEmitter('select-content',
                      'overlay',
                      `${this.selectedOverlayProperties.Overlay}`,
                      response.length);
      // TODO Should defer persisting selectedOverlayProperties until load is successful
      const appSettings: AppSettings = new AppSettings();
      appSettings.previousSelectedOverlay = this.selectedOverlayProperties.Overlay as string;
      // yield for a millisecond to allow view to update so toaster message can display.
      this.startSpinner();
      setTimeout(this.renderHeritageStyles.bind(this, response), 1);
    },
      error  => {
        this.stopSpinner();
        // console.log('Error reading overlays');
        this.lintMessage = parseErrorMessage(error, `Error fetching heritage sites from Overlay : ${overlayId}`);
        this.showMessage(this.lintMessage, 15000);
        this.gtmService.pushTag({
          event: 'apiError',
          type:  `${overlayId}`,
          data:  'errorMessage',
          value: `${this.lintMessage}`
        });
        this._gtagService
        .eventEmitter(
            'api-error',
            'overlay-list',
             `${this.selectedOverlayProperties.Overlay}`);
    }
   );
  }


  renderHeritageStyles(response:any[]) {
    if (response[0].hasOwnProperty('vhdplaceid')) {
      this.loadHeritageShadingScheme();
      this.stylesFormGroup.controls.strokeColor.patchValue(HERITAGE_SITE_STROKE_COLOR);
      this.schemaFormGroup.controls.geoColumn.patchValue({ geoColumn: 'bndry'});
      this.updateStyles('vhdplaceid');
      this.stopSpinner();
      return true;
    }
  }

  queryPlanningApplications(overlayId: string = null) {
    if (this.pending) { return; }
    this.startSpinner();

    this.dataService.getPlanningApplications(overlayId).subscribe(
      response => {
        this.stopSpinner();
        console.log(response);
        this.columns = Object.keys(response[0]);
        this.rows = response;
        const heritageFill = this.getHeritageShadingFill();
        const opaqueStyle = {isComputed: false, value: 0.3};
        const heritageOpacity = opaqueStyle; // HERITAGE_SITE_FILL_OPACITY;
        const appSettings: AppSettings = new AppSettings();

        if (response[0].hasOwnProperty('Application_Number')) {
          this.loadHeritageShadingScheme();
          this.stylesFormGroup.controls.strokeColor.patchValue(PLANNING_APP_STROKE_COLOR);
          this.stylesFormGroup.controls.circleRadius.patchValue(HERITAGE_SITE_CIRCLE_RADIUS);
          this.updateStyles('Application_Number');
          this.showMessage(`Showing Planning Applications within Overlay ${this.overlayProperties.Overlay}`, 5000);
        }
        /*
        .catch((e) => {
          this.lintMessage = parseErrorMessage('Error fetching overlays: ', e);
          this.showMessage(this.lintMessage);
          gtag('event', 'exception', {
            event_category: `query`,
            event_label: `${overlayId}`,
            value: `sql: ${sql}, error: ${this.lintMessage}`
          });

      })
      */
     });
  }

  /* This will be the first query */

  queryOverlays(param: string = null) {
    if ((param !== 'initial') && (this.pending === true)) {
        return;
    }
    this.startSpinner();
    this.dataService.getOverlays().subscribe(

      response => {
        this.stopSpinner();
        this.columns = Object.keys(response[0]);
        this.rows = response;
        const heritageFill = this.getHeritageShadingFill();
        const opaqueStyle = {isComputed: false, value: 0.3};
        const heritageOpacity = opaqueStyle; // HERITAGE_SITE_FILL_OPACITY;
        const appSettings: AppSettings = new AppSettings();

        if (response[0].hasOwnProperty('ZONE_DESC')) {
            this.handleQueryOverlaysResponse();
            // setup custom styling
            this.setNumStops(<FormGroup>this.stylesFormGroup.controls.fillColor, OVERLAY_FILL_COLOR.domain.length);
            this.setNumStops(<FormGroup>this.stylesFormGroup.controls.strokeColor, OVERLAY_STROKE_COLOR.domain.length);
            this.stylesFormGroup.controls.fillColor.patchValue(OVERLAY_FILL_COLOR);
            this.stylesFormGroup.controls.fillOpacity.patchValue(OVERLAY_FILL_OPACITY);
            this.stylesFormGroup.controls.strokeColor.patchValue(OVERLAY_STROKE_COLOR);
            this.stylesFormGroup.controls.strokeOpacity.patchValue(OVERLAY_STROKE_OPACITY);
            this.schemaFormGroup.controls.geoColumn.patchValue({ geoColumn: 'OverlayBoundary'});

            this.updateStyles('Overlays');
            if (this._loadSitesForPreviousOverlay === false) {
              this.showMessage('Zoom to the City of Yarra, near Melbourne then click an overlay on the map for its details', 5000);
            }
        }
        this._gtagService.eventEmitter('view_item_list', 'overlays', 'not-set', response.length);
      },

      error  => {
        this.stopSpinner();
        this.lintMessage = parseErrorMessage(error, 'Error fetching overlays: ');
        this.showMessage(this.lintMessage, 15000);
        console.log(this.lintMessage);
        this.gtmService.pushTag({
          event: 'apiError',
          type:  `getOverlays`,
          data:  'errorMessage',
          value: `${this.lintMessage}`
        });
        this._gtagService.eventEmitter('api-error', 'get-overlays', this.lintMessage);
      }
   );
  }

  getPreviousOverlay(appSettings: AppSettings): OverlayProperties {
    // Get selection from previous session to initialise.
    const previousOverlay = appSettings.previousSelectedOverlay;
    if (previousOverlay) {
      const foundLastSelectedOverlay: OverlayProperties = this.matchingOverlays.find( o => o.Overlay === previousOverlay);
      this.gtmService.pushTag({
        event: 'readStore',
        type:  `getOverlays`,
        data:  'returned',
        value: `found ${foundLastSelectedOverlay}`
      });
      return foundLastSelectedOverlay;
    }
    this.gtmService.pushTag({
      event: 'readStore',
      type:  `getOverlays`,
      data:  'returned',
      value: `not found`
    });
  return null;
  }

  handleQueryOverlaysResponse() {
      const queriedHeritageOverlays: Array<OverlayProperties> = [];
      const rows = this.rows;
      rows.forEach(row => {
        const ovl: OverlayProperties = new OverlayProperties(null);
        ovl.setOverlayFromRows(row);
        queriedHeritageOverlays.push(ovl);
      });
      this.matchingOverlays = queriedHeritageOverlays;

      // Get selection from previous session to initialise.
      const appSettings: AppSettings = new AppSettings();
      const lastSelectedOverlay = this.getPreviousOverlay(appSettings);
      if (lastSelectedOverlay !== null && this._loadSitesForPreviousOverlay) {
        // Automatically select it and fetch data for Selected overlay only if loadSitesForPreviousOverlay is set.
        this.handleMapOverlaySelected(lastSelectedOverlay);
      }
  }

  updateStyles(layer: String) {
    if (this.stylesFormGroup.invalid) {
      console.log('invalid style');
      return;
    }
    const styles = new LayerStyles();
    styles.styleRules = this.stylesFormGroup.getRawValue();
    styles.layer = layer;
    this.styles = styles;
  }

  getRowWidth() {
    return (this.columns.length * 100) + 'px';
  }

  onFillPreset() {
    const heritageFill = this.getHeritageShadingFill();
    switch (this.stepIndex) {
      case Step.DATA:
        this.schemaFormGroup.patchValue({ sql: HERITAGE_SITE_QUERY });
        break;
      case Step.SCHEMA:
        this.schemaFormGroup.patchValue({ geoColumn: 'WKT', latColumn: 'lat_avg', lngColumn: 'lng_avg' });
        break;
      case Step.STYLE:
        const opaqueStyle = {isComputed: false, value: 0.3};
        const heritageOpacity = opaqueStyle;
        this.setNumStops(<FormGroup>this.stylesFormGroup.controls.fillColor, heritageFill.domain.length);
        this.setNumStops(<FormGroup>this.stylesFormGroup.controls.circleRadius, HERITAGE_SITE_CIRCLE_RADIUS.domain.length);
        this.stylesFormGroup.controls.fillOpacity.patchValue(heritageOpacity);
        this.stylesFormGroup.controls.fillColor.patchValue(heritageFill);
        this.stylesFormGroup.controls.circleRadius.patchValue(HERITAGE_SITE_CIRCLE_RADIUS);
        break;
      default:
        console.warn(`Unexpected step index, ${this.stepIndex}.`);
    }

    gtag('event', 'preset', { event_label: `step ${this.stepIndex}` });
  }

  setNumStops(group: FormGroup, numStops: number): void {
    const domain = <FormArray>group.controls.domain;
    const range = <FormArray>group.controls.range;
    while (domain.length !== numStops) {
      if (domain.length < numStops) {
        domain.push(new FormControl(''));
        range.push(new FormControl(''));
      }
      if (domain.length > numStops) {
        domain.removeAt(domain.length - 1);
        range.removeAt(range.length - 1);
      }
    }
  }

  createStyleFormGroup(): FormGroup {
    return this._formBuilder.group({
      isComputed: [false],
      value: [''],
      property: [''],
      function: [''],
      domain: this._formBuilder.array([[''], ['']]),
      range: this._formBuilder.array([[''], ['']])
    });
  }

  getPropStatus(propName: string): string {
    const rule = <StyleRule>this.stylesFormGroup.controls[propName].value;
    if (!rule.isComputed && rule.value) { return 'global'; }
    if (rule.isComputed && rule.function) { return 'computed'; }
    return 'none';
  }

  featureHideRequest(event): void {
      const status = event['HeritageStatus'];
      const htmlContentString = `
          Removed ${status} site in ${event['Overlay']} at
          ${event['EZI_ADD']}
          `;
      this.showMessage(htmlContentString);
      this.hidePropertySubject.next(event);
  }

  getPropStats(propName: string): ColumnStat {
    const group = <FormGroup>this.stylesFormGroup.controls[propName];
    const rawValue = group.value;
    if (!rawValue.property) { return null; }
    return this.stats.get(rawValue.property);
  }

  getPropFormGroup(propName: string): FormGroup {
    return <FormGroup>this.stylesFormGroup.controls[propName];
  }

  showMessage(message: string, duration: number = 5000) {
    console.warn(message);
    this._ngZone.run(() => {
      this._snackbar.open(message, undefined, { duration: duration,  verticalPosition: 'top', horizontalPosition: 'left'});
    });
  }

  openAccordion(state: boolean) {
    const appSettings: AppSettings = new AppSettings();
    this.advancedControlsOpened = state;
    appSettings.advancedControlsOpened = state;
  }

  loadSitesForPreviousOverlay(event: MatSlideToggleChange ) {
      const appSettings: AppSettings = new AppSettings();
      this._loadSitesForPreviousOverlay = event.checked;
      appSettings.loadSitesForPreviousOverlay = event.checked;
      this.sidenavOpened = this.advancedControlsOpened; // leave opened when advanced.
  }

  dragEnd(unit, {sizes}) {
    if (unit === 'percent') {
      this.splitterSizeSubject.next(sizes);
      const appSettings: AppSettings = new AppSettings();
      appSettings.area1 = sizes[0];
      appSettings.area2 = sizes[1];
      appSettings.saveAppSettings();
    }
   }
}

function parseErrorMessage (e, defaultMessage = 'Something went wrong'): string {
  if (e.message) { return e.message; }
  if (e.result && e.result.error && e.result.error.message) {
    return e.result.error.message;
  }
  return defaultMessage;
}

