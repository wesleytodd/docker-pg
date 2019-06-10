'use strict'
const { describe, it } = require('mocha')
const dockerpg = require('..')
const { Client } = require('pg')
const pkg = require('../package.json')

describe(pkg.name, () => {
  it('should start and stop a postgres docker container', async function () {
    this.timeout(1000 * 60 * 2)
    const shutdown = await dockerpg({
      serviceName: 'docker-pg-test-postgres',
      onWait: () => {},
      onReady: () => {}
    })

    // Ensure we can connect and query
    const conn = new Client({
      user: 'postgres',
      database: 'postgres',
      password: 'postgres',
      port: 5432
    })
    await conn.connect()
    await conn.query('SELECT TRUE')
    await conn.end()

    // Shutdown the container
    await shutdown()
  })
})
