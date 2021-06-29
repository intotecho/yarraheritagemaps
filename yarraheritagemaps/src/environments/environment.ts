
const YarraScrapeOAuthClientID = 'XXXXXXXXXXXXXXXXXXXXXXXXXX.apps.googleusercontent.com'; //Keep it secret, i.e. don't check it in

export const environment = {
  production: false,
  yarraheritagemapsAPIBasePath: 'http://localhost:8080',
};

export const bigquery_environment = {
  authClientID: YarraScrapeOAuthClientID,  // Not used anymore since rest API replaces bigquery service
  authScope: 'https://www.googleapis.com/auth/bigquery', // Not used anymore since rest API replaces bigquery service
  projectId: 'yarrascrape', // Not used anymore since rest API replaces bigquery service
  _DATASET: 'YarraPlanning',  // Not used anymore since rest API replaces bigquery service
};
