import {
  BBContextArgs
} from '@blackbaud/auth-client';

import {
  BBAuthClientFactory
} from '@skyux/auth-client-factory';

import {
  SkyAuthContextProvider
} from './auth-context-provider';

describe('Auth context provider', () => {

  it('should call BBContextProvider.ensureContext', async () => {
    const factorySpy = spyOn(BBAuthClientFactory.BBContextProvider, 'ensureContext')
      .and
      .returnValue(Promise.resolve({}));

      const args: BBContextArgs = {
        envId: 'foobar'
      };

      const provider = new SkyAuthContextProvider();

      await provider.ensureContext(args);

      expect(factorySpy).toHaveBeenCalledWith(args);
  });

});
