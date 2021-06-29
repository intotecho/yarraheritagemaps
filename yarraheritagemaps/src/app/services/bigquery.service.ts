/**
 *    https://www.apache.org/licenses/LICENSE-2.0
 *    This service is no longer used. It has been replaced with a REST API which is more secure.
 *    However, this is left for an example.
 */
import { bigquery_environment } from '../../environments/environment';
import { MAX_RESULTS, TIMEOUT_MS } from '../app.constants';
import { OverlayProperties } from '../main/panels/overlays-properties';
export const ColumnType = {
  STRING: 'string',
  NUMBER: 'number',
  LAT: 'latitude',
  LNG: 'longitude',
  WKT: 'wkt',
  DATE: 'date',
  ID: 'id'
};


export interface ColumnStat {
  min: number;
  max: number;
  nulls: number;
}

export interface Project {
  id: string;
}

export interface BigQueryResponse {
  error: string | undefined;
  columns: Array<Object> | undefined;
  columnNames: Array<string> | undefined;
  rows: Array<Object> | undefined;
  stats: Map<String, ColumnStat> | undefined;
}

/**
 * Utility class for managing interaction with the Cloud BigQuery API.
 */
export class BigQueryService {

  public isSignedIn = false;
  public projects: Array<Project> = [];

  private signinChangeCallback = () => {};

  /**
   * Initializes the service. Must be called before any queries are made.
   */
  init(): Promise<void> {
    // Wait for Google APIs to load, then initialize and try to authenticate.
    return pendingGapi
      .then(() => {
        gapi.client.init({
          clientId: bigquery_environment.authClientID,
          scope: bigquery_environment.authScope
        })
          .then(() => {
            gapi['auth2'].getAuthInstance().isSignedIn.listen(((isSignedIn) => {
              this.isSignedIn = isSignedIn;
              this.signinChangeCallback();
            }));
            this.isSignedIn = !!gapi['auth2'].getAuthInstance().isSignedIn.get();
            this.signinChangeCallback();
          });
      });
  }

  /**
   * Returns current user details.
   */
  getUser(): Object {
    return gapi['auth2'].getAuthInstance().currentUser.get();
  }

  getUserEmail(): Object {
    return gapi['auth2'].getAuthInstance().currentUser.get().getBasicProfile().getEmail();
  }

  getUserImageUrl(): Object {
    return gapi['auth2'].getAuthInstance().currentUser.get().getBasicProfile().getImageUrl();
  }

  /**
   * Attempts session login.
   */
  signin() {
    gapi['auth2'].getAuthInstance().signIn().then(() => this.signinChangeCallback());
  }

  /**
   * Logs out of current session.
   */
  signout() {
    gapi['auth2'].getAuthInstance().signOut().then(() => this.signinChangeCallback());
  }

  /**
   * Sets callback to be invoked when signin status changes.
   * @param callback
   */
  onSigninChange(callback): void {
    this.signinChangeCallback = callback;
  }

  /**
   * Queries and returns a list of GCP projects available to the current user.
   */
  getProjects(): Promise<Array<Project>> {
    if (this.projects.length) { return Promise.resolve(this.projects); }

    return gapi.client.request({path: `https://www.googleapis.com/bigquery/v2/projects?maxResults=100000`})
      .then((response) => {
        this.projects = response.result.projects.slice();
        this.projects.sort((p1, p2) => p1['id'] > p2['id'] ? 1 : -1);
        return <Array<Project>> this.projects;
      });
  }

  /**
   * Performs a dry run for the given query, and returns estimated bytes to be processed.
   * If the dry run fails, returns -1.
   * @param projectID
   * @param sql
   */
  prequery(overlay: OverlayProperties, projectID: string, sql: string, location: string): Promise<number> {
    const body = {
      dryRun: true,
      query: sql,
      maxResults: MAX_RESULTS,
      timeoutMs: TIMEOUT_MS,
      queryParameters: [
        {
          parameterType: {
            type: 'STRING'
          },
          parameterValue: {
            value: overlay
          },
          name: 'overlay'
        },
      ],
      useLegacySql: false
    };
    if (location) { body['location'] = location; }
    return gapi.client.request({
      path: `https://www.googleapis.com/bigquery/v2/projects/${projectID}/queries`,
      method: 'POST',
      body: body
    }).then((response) => {
      return Number( (response.result || {})['totalBytesProcessed'] || 0 );
    }).catch((e) => {
      if (e && e.result && e.result.error) {
        throw new Error(e.result.error.message);
      }
      console.warn(e);
      return -1;
    });
  }

  query(overlay: OverlayProperties, projectID: string, sql: string, location: string): Promise<BigQueryResponse> {
    const body = {
      query: sql,
      maxResults: MAX_RESULTS,
      timeoutMs: TIMEOUT_MS,
      // params: {overlay: 'HO317'},
      queryParameters: [
        {
          parameterType: {
            type: 'STRING'
          },
          parameterValue: {
            value: overlay
          },
          name: 'overlay'
        },
      ],
      useLegacySql: false,
    };
    if (location) { body['location'] = location;   }
    return gapi.client.request({
      path: `https://www.googleapis.com/bigquery/v2/projects/${projectID}/queries`,
      method: 'POST',
      body: body
    }).then((response) => {
      const stats = new Map();

      if (response.result.jobComplete === false) {
        throw new Error(`Request timed out after ${TIMEOUT_MS / 1000} seconds. This UI does not yet handle longer jobs.`);
      }

      // Normalize column types.
      const columnNames = [];
      const columns = (response.result.schema.fields || []).map((field) => {
        if (isNumericField(field)) {
          field.type = ColumnType.NUMBER;
          stats.set(field.name, {min: Infinity, max: -Infinity, nulls: 0});
        } else {
          field.type = ColumnType.STRING;
        }
        columnNames.push(field.name);
        return field;
      });

      // Normalize row structure.
      const rows = (response.result.rows || []).map((row) => {
        const rowObject = {};
        row.f.forEach(({v}, index) => {
          const column = columns[index];
          if (column.type === ColumnType.NUMBER) {
            v = v === '' || v === null ? null : Number(v);
            rowObject[column.name] = v;
            const stat = stats.get(column.name);
            if (v === null) {
              stat.nulls++;
            } else {
              stat.max = Math.round( Math.max(stat.max, v) * 1000 ) / 1000;
              stat.min = Math.round( Math.min(stat.min, v) * 1000 ) / 1000;
            }
          } else {
            rowObject[column.name] = String(v);
          }
        });
        return rowObject;
      });

      /*
      if (rows.length === 0) {
        throw new Error('No results.');
      }
      */
      return {columns, columnNames, rows, stats} as BigQueryResponse;
    });
  }
}

function isNumericField(field: Object) {
  const fieldType = field['type'].toUpperCase();
  return ['INTEGER', 'NUMBER', 'FLOAT', 'DECIMAL'].includes(fieldType);
}
