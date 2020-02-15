//#region imports

import {
  HTTP_INTERCEPTORS,
  HttpClientModule
} from '@angular/common/http';

import {
  NgModule
} from '@angular/core';

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
    }
  ],
  exports: [
    HttpClientModule
  ]
})
export class SkyAuthHttpClientModule { }
