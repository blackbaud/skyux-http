//#region imports

import {
  NgModule
} from '@angular/core';

import {
  HTTP_INTERCEPTORS
} from '@angular/common/http';

import {
  SkyAuthHttp
} from './auth-http';

import {
  SkyAuthTokenProvider
} from './auth-token-provider';

import {
  SkyAuthInterceptor
} from './auth-interceptor';

//#endregion

@NgModule({
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: SkyAuthInterceptor,
      multi: true
    },
    SkyAuthHttp,
    SkyAuthTokenProvider
  ]
})
export class SkyAuthHttpModule { }
