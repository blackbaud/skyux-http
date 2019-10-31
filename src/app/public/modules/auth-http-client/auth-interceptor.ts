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

//#endregion

const TOKENIZED_LOCAL_URL_REGEX = /1bb:\/\/([a-z0-9\-]+)(:[0-9]+)?\/(.*)/;

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

function getUrl(requestUrl: string, token: string): Promise<string> {
  const decodedToken = this.tokenProvider.decodeToken(token);
  return BBAuthClientFactory.BBAuth.getUrl(requestUrl, {zone:  decodedToken['1bb.zone'] });
}

function getClient(handler: HttpHandler): HttpClient {
  return new HttpClient(handler);
}

function getLocallyServedUrl(requestUrl: string, token: string, handler: HttpHandler): Promise<string> {
  const regexGroups: any = TOKENIZED_LOCAL_URL_REGEX.exec(requestUrl);
  if (regexGroups) {
    if (regexGroups[2]) {
      let client: HttpClient = getClient(handler);
      client.get(`http://localhost${regexGroups[2]}/version`).subscribe((res) => {
        return Promise.resolve(`http:localhost${regexGroups[2]}/${regexGroups[3]}`);
      }, () => {
        // TODO maybe put something here in order to debug not hitting local when you think you should be
        return getUrl(requestUrl, token);
      });
    } else {
      return getUrl(requestUrl, token);
    }
  } else {
    return getUrl(requestUrl, token);
  }
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
            getLocallyServedUrl(request.url, token, next) :
            getUrl(request.url, token);

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

}
