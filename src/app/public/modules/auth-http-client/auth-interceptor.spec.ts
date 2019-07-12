//#region imports

import {
  HttpEventType,
  HttpHandler,
  HttpParams,
  HttpRequest,
  HttpSentEvent
} from '@angular/common/http';

import {
  Observable
} from 'rxjs/Observable';

import 'rxjs/add/observable/of';

import {
  SkyAuthToken
} from '../auth-http';

import {
  SkyAuthTokenContextArgs
} from '../auth-http/auth-token-context-args';

import {
  SkyAuthInterceptor
} from './auth-interceptor';

import {
  SKY_AUTH_PARAM_AUTH,
  SKY_AUTH_PARAM_PERMISSION_SCOPE
} from './auth-interceptor-params';

//#endregion

class MockHttpHandler extends HttpHandler {
  public handle() {
    return Observable.of({
      type: HttpEventType.Sent
    } as HttpSentEvent);
  }
}

describe('Auth interceptor', () => {
  let mockTokenProvider: any;

  function createInteceptor(envId?: string, leId?: string, getUrlResult?: string) {
    return new SkyAuthInterceptor(
      mockTokenProvider,
      {
        runtime: {
          params: {
            get: (name: string) => {
              switch (name) {
                case 'envid':
                  return envId;
                case 'leid':
                  return leId;
                default:
                  return undefined;
              }
            },
            getUrl: (url: string) => getUrlResult || url || 'https://example.com/get/'
          }
        } as any,
        skyux: {}
      });
  }

  function createRequest(params?: HttpParams, url?: string) {
    const request = new HttpRequest(
      'GET',
      url || 'https://example.com/get/',
      {
        params: params
      }
    );

    return request;
  }

  function validateAuthRequest(
    next: MockHttpHandler,
    done: DoneFn,
    cb: (authRequest: HttpRequest<any>) => void
  ) {
    spyOn(next, 'handle').and.callFake(
      (authRequest: HttpRequest<any>) => {
        cb(authRequest);
        done();
        return Observable.of('');
      }
    );
  }

  function validateContext(
    envId: string,
    leId: string,
    permissionScope: string,
    expectedUrl: string,
    done: DoneFn
  ) {
    const interceptor = createInteceptor(envId, leId, expectedUrl);

    let params = new HttpParams().set(SKY_AUTH_PARAM_AUTH, 'true');

    if (permissionScope) {
      params = params.set(SKY_AUTH_PARAM_PERMISSION_SCOPE, permissionScope);
    }

    const request = createRequest(params);

    const next = new MockHttpHandler();

    interceptor.intercept(request, next);

    validateAuthRequest(next, done, (authRequest) => {
      expect(authRequest.url).toBe(expectedUrl);
    });

    interceptor.intercept(request, next).subscribe(() => {});

    const expectedTokenArgs: SkyAuthTokenContextArgs = {};

    if (permissionScope) {
      expectedTokenArgs.permissionScope = permissionScope;
    }

    expect(mockTokenProvider.getContextToken).toHaveBeenCalledWith(
      jasmine.objectContaining(expectedTokenArgs)
    );
  }

  beforeEach(() => {
    mockTokenProvider = {
      getContextToken: jasmine.createSpy('getContextToken')
        .and
        .returnValue(Promise.resolve('abc')),
      decodeToken: (token: string): SkyAuthToken => {
        return {
          '1bb.zone': 'p-can01'
        };
      }
    };
  });

  it('should pass through the existing request when not an auth request', () => {
    const interceptor = createInteceptor();

    const request = createRequest();

    const next = new MockHttpHandler();

    const handleSpy = spyOn(next, 'handle');

    interceptor.intercept(request, next);

    expect(handleSpy).toHaveBeenCalledWith(request);
  });

  it('should add a token to the request if the sky_auth parameter is set', (done) => {
    const interceptor = createInteceptor();

    const request = createRequest(
      new HttpParams()
        .set(SKY_AUTH_PARAM_AUTH, 'true')
    );

    const next = new MockHttpHandler();

    validateAuthRequest(next, done, (authRequest) => {
      expect(authRequest.headers.get('Authorization')).toBe('Bearer abc');
    });

    interceptor.intercept(request, next).subscribe(() => {});
  });

  it('should add a permission scope to the token request if specified', (done) => {
    validateContext(undefined, undefined, '123', 'https://example.com/get/', done);
  });

  it('should apply the appropriate environment context', (done) => {
    validateContext('abc', undefined, undefined, 'https://example.com/get/?envid=abc', done);
  });

  it('should apply the appropriate legal entity context', (done) => {
    validateContext(undefined, 'abc', undefined, 'https://example.com/get/?leid=abc', done);
  });

  it('should convert tokenized urls and honor the hard-coded zone.', (done) => {
    const interceptor = createInteceptor();

    const request = createRequest(
      new HttpParams()
          .set(SKY_AUTH_PARAM_AUTH, 'true'),
      '1bb://eng-hub00-pusa01/version'
    );

    const next = new MockHttpHandler();
    validateAuthRequest(next, done, (authRequest) => {
      expect(authRequest.url).toBe('https://eng-pusa01.app.blackbaud.net/hub00/version');
    });

    interceptor.intercept(request, next).subscribe(() => {});
  });

  it('should convert tokenized urls and get zone from the token.', (done) => {
    const interceptor = createInteceptor();

    const request = createRequest(
      new HttpParams()
          .set(SKY_AUTH_PARAM_AUTH, 'true'),
      '1bb://eng-hub00/version'
    );

    const next = new MockHttpHandler();
    validateAuthRequest(next, done, (authRequest) => {
      expect(authRequest.url).toBe('https://eng-pcan01.app.blackbaud.net/hub00/version');
    });

    interceptor.intercept(request, next).subscribe(() => {});
  });

});
