# A utility to create a Postgres Docker container

Mainly for testing setup, this is a utility to create and wait for a Postgres
container.  Requires docker and docker-compose on your system.

```
$ npm i docker-pg
```

```javascript
const dockerpg = require('docker-pg')
const shutdown = await dockerpg({
  serviceName: 'my-test-pg',
  hostPort: 5432
})

// do stuff with the container

await shutdown()
```
