import {
  Injectable
} from '@angular/core';

import {
  BBContextArgs
} from '@blackbaud/auth-client';

import {
  BBAuthClientFactory
} from '@skyux/auth-client-factory';

@Injectable({
  providedIn: 'root'
})
export class SkyAuthContextProvider {

  public ensureContext(args: BBContextArgs) {
    return BBAuthClientFactory.BBContextProvider.ensureContext(args);
  }

}
