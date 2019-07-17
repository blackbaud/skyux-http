export class MockSkyAppConfig {

  public runtime = {
    app: {
      name: 'test'
    },
    params: {
      getUrl: (url: string) => url
    }
  };

}
