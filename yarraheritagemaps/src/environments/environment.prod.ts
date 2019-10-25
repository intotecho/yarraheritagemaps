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
const BigQueryPublicAccessKey = 'AIzaSyArlp3qQv07_qjGr9P6fjHwy10HXeFj-Fw';
const YarraScrapeOAuthClientID = '805117261004-oul8f6c5uhbvi4n043klqpj5u7jd74co.apps.googleusercontent.com';

export const environment = {
  production: true,
  authClientID: YarraScrapeOAuthClientID,
  authScope: 'https://www.googleapis.com/auth/bigquery',
  projectId: 'yarrascrape',
  dataAPIBasePath: 'https://yarrascrape.appspot.com',
  _DATASET: 'YarraPlanning' // not used.
};
