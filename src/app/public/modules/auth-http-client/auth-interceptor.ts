//#region imports
import {
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
  SkyAppConfig
} from '@skyux/config';

import {
  from as observableFrom,
  Observable
} from 'rxjs';

import {
  switchMap
} from 'rxjs/operators';

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
    @Inject(SKY_AUTH_DEFAULT_PERMISSION_SCOPE) @Optional() private defaultPermissionScope: string
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
      const tokenContextArgs: SkyAuthTokenContextArgs = {};

      if (permissionScope) {
        tokenContextArgs.permissionScope = permissionScope;
      } else if (this.defaultPermissionScope) {
        tokenContextArgs.permissionScope = this.defaultPermissionScope;
      }

      return observableFrom(this.tokenProvider.getContextToken(tokenContextArgs)).pipe(
        switchMap((token) => {
          let authRequest = request.clone({
            setHeaders: {
              Authorization: `Bearer ${token}`
            },
            url: this.config.runtime.params.getUrl(request.url)
          });

          return next.handle(authRequest);
        }));
    }

    return next.handle(request);
  }

}
