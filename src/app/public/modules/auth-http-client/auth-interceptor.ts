//#region imports

import {
  HttpClient,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest
} from '@angular/common/http';

import {
  Inject,
  Injectable,
  Optional
} from '@angular/core';

import {
  Observable
} from 'rxjs/Observable';

import 'rxjs/add/observable/fromPromise';

import 'rxjs/add/operator/switchMap';

import {
  BBAuthClientFactory
} from '@skyux/auth-client-factory';

import {
  SkyAppConfig
} from '@skyux/config';

import {
  SkyAuthTokenContextArgs,
  SkyAuthTokenProvider
} from '../auth-http';

import {
  SKY_AUTH_DEFAULT_PERMISSION_SCOPE
} from './auth-interceptor-default-permission-scope';

import {
  SKY_AUTH_PARAM_AUTH,
  SKY_AUTH_PARAM_PERMISSION_SCOPE
} from './auth-interceptor-params';

import {
  ENDPOINT_INDEX,
  LOCAL_PORT_INDEX,
  TOKENIZED_URL_REGEX
} from '@blackbaud/auth-client';

//#endregion

function removeSkyParams(request: HttpRequest<any>): HttpRequest<any> {
  // The if statement here is just a sanity check; it appears that by the time
  // this interceptor is called, the params property is always defined, even if
  // it's not provided when the HTTP request is created.
  /* istanbul ignore else */
  if (request.params) {
    request = request.clone(
      {
        params: request.params
          .delete(SKY_AUTH_PARAM_AUTH)
          .delete(SKY_AUTH_PARAM_PERMISSION_SCOPE)
      }
    );
  }

  return request;
}

@Injectable()
export class SkyAuthInterceptor implements HttpInterceptor {
  constructor(
    private tokenProvider: SkyAuthTokenProvider,
    private config: SkyAppConfig,
    @Inject(SKY_AUTH_DEFAULT_PERMISSION_SCOPE) @Optional() private defaultPermissionScope?: string
  ) { }

  public intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    let auth: boolean;
    let permissionScope: string;

    const params = request.params;

    if (
      params &&
      (
        params.has(SKY_AUTH_PARAM_AUTH) ||
        params.has(SKY_AUTH_PARAM_PERMISSION_SCOPE)
      )
    ) {
      auth = params.get(SKY_AUTH_PARAM_AUTH) === 'true';
      permissionScope = params.get(SKY_AUTH_PARAM_PERMISSION_SCOPE);

      request = removeSkyParams(request);
    }

    if (auth) {
      permissionScope = permissionScope || this.defaultPermissionScope;

      const tokenContextArgs: SkyAuthTokenContextArgs = {};

      if (permissionScope) {
        tokenContextArgs.permissionScope = permissionScope;
      }

      return Observable
        .fromPromise(this.tokenProvider.getContextToken(tokenContextArgs))
        .switchMap((token) => {
          let urlToUse: Promise<string> = this.config.runtime.command === 'serve' ?
            this.getLocallyServedUrl(request.url, token, next) :
            this.getUrl(request.url, token);

          return Observable
            .fromPromise(urlToUse)
            .switchMap((url) => {
              let authRequest = request.clone({
                setHeaders: {
                  Authorization: `Bearer ${token}`
                },
                url: this.config.runtime.params.getUrl(url)
              });
              return next.handle(authRequest);
            });
        });
    }

    return next.handle(request);
  }

  public getClient(handler: HttpHandler): HttpClient {
    return new HttpClient(handler);
  }

  private getUrl(requestUrl: string, token: string): Promise<string> {
    const decodedToken = this.tokenProvider.decodeToken(token);
    return BBAuthClientFactory.BBAuth.getUrl(requestUrl, {zone:  decodedToken['1bb.zone'] });
  }

  private getLocallyServedUrl(requestUrl: string, token: string, handler: HttpHandler): Promise<string> {
    let match = TOKENIZED_URL_REGEX.exec(requestUrl);
    if (match && match[LOCAL_PORT_INDEX]) {
      let localPort = match[LOCAL_PORT_INDEX];
      let client: HttpClient = this.getClient(handler);
      client.get(`http://localhost${localPort}/version`).subscribe(
        () => {
          return Promise.resolve(`http:localhost${localPort}/${match[ENDPOINT_INDEX]}`);
        },
        () => {
          // TODO maybe put something here in order to debug not hitting local when you think you should be
          return this.getUrl(requestUrl, token);
        });
    } else {
      return this.getUrl(requestUrl, token);
    }
  }

}
