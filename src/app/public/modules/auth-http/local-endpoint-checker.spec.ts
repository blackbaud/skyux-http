import {
  HttpHandler
} from '@angular/common/http';

import {
  throwError
} from 'rxjs/index';

import {
  Observable
} from 'rxjs/Observable';

import {
  LocalEndpointChecker
} from './local-endpoint-checker';

type Spy<T> = { [Method in keyof T]: jasmine.Spy; };

describe('Local Endpoint Checker', () => {

  let next: Spy<HttpHandler> = jasmine.createSpyObj('HttpHandler', ['handle']);
  const prodUrl = 'https://eng-pusa01.app.blackbaud.net/hub00/version';
  const requestUrl = '1bb://eng-hub00-pusa01:8080/version';

  it('should convert to a local server url when there is a port provided and a successful local service check', (done) => {

    next.handle.and.returnValue(Observable.of('ok'));

    invokeUrlCheck().then((resultingUrl) => {
      expect(resultingUrl).toBe('http://localhost:8080/version');
      done();
    });
  });

  it('should convert tokenized urls when serving locally with a provided port but are unable to find the service locally', (done) => {

    next.handle.and.returnValue(throwError('service not found locally so we boomz-mcgeee!'));

    invokeUrlCheck().then((resultingUrl) => {
      expect(resultingUrl).toBe(prodUrl);
      done();
    });
  });

  function invokeUrlCheck(): Promise<string> {
    return LocalEndpointChecker.getUrlForLocalServe(
      requestUrl,
      next,
      'http://localhost',
      () => { return Promise.resolve(prodUrl); }
    );
  }
});
