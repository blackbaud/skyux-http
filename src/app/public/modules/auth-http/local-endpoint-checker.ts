import {
  HttpClient,
  HttpHandler
} from '@angular/common/http';

import {
  BBAuthClientFactory
} from '@skyux/auth-client-factory';

export class LocalEndpointChecker {

  public static getUrlForLocalServe(requestUrl: string,
                                    handler: HttpHandler,
                                    baseLocalServer: string,
                                    fallBack: () => Promise<string>): Promise<string> {
    let urlData = BBAuthClientFactory.BBAuth.extractUrl(requestUrl);
    if (urlData.port) {
      let localPort = urlData.port;
      let client: HttpClient = new HttpClient(handler);
      return client.get(`${baseLocalServer}:${localPort}/version`).toPromise()
        .then(() => {
          return Promise.resolve(`${baseLocalServer}:${localPort}/${urlData.endpoint}`);
        })
        .catch(() => {
          // TODO something here in order to debug not hitting local when you think you should be?
          return fallBack();
        });
    } else {
      return fallBack();
    }
  }
}
