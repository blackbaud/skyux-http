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
    let localPort = urlData.port;
    if (localPort) {
      let client: HttpClient = new HttpClient(handler);
      let url = `${baseLocalServer}:${localPort}/monitor`;
      return client.get(url).toPromise()
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
