'use strict'
const path = require('path')
const os = require('os')
const util = require('util')
const execFile = util.promisify(require('child_process').execFile)
const fs = require('fs')
const access = util.promisify(fs.access)
const writeFile = util.promisify(fs.writeFile)
const unlink = util.promisify(fs.unlink)

module.exports = async function (options = {}) {
  // Defaults
  const opts = Object.assign({
    serviceName: 'postgres',
    dockerComposeFile: path.join(os.tmpdir(), `docker-compose-${options.serviceName || 'postgres'}.yml`),
    hostPort: 5432,
    containerPort: 5432,
    image: 'postgres',
    database: 'postgres',
    user: 'postgres',
    password: 'postgres',
    waitForSec: 120,
    force: false,
    onWait: () => {
      process.stdout.write('.')
    },
    onReady: () => {
      process.stdout.write(`ready: ${opts.serviceName}\n`)
    }
  }, options)

  // Check if the file exists
  let exists = false
  try {
    exists = !!await access(opts.dockerComposeFile, fs.constants.W_OK)
  } catch (e) { /* ignore */ }

  // Write compose file
  let wroteComposeFile = false
  if (!exists || opts.force) {
    await writeFile(opts.dockerComposeFile, DOCKER_COMPOSE(opts))
    wroteComposeFile = true
  }

  // Start container
  await execFile('docker-compose', ['-f', opts.dockerComposeFile, 'up', '-d'], {
    cwd: path.dirname(opts.dockerComposeFile)
  })

  // Wait for postgres
  await wait(opts.containerName || opts.serviceName, (attempt) => {
    return new Promise((resolve, reject) => {
      if (attempt > opts.waitForSec) {
        return reject(new Error('Container failed to start'))
      }

      opts.onWait()
      setTimeout(resolve, 1000)
    })
  })
  opts.onReady()

  return async () => {
    await execFile('docker-compose', ['-f', opts.dockerComposeFile, 'down'])
    wroteComposeFile && !opts.force && await unlink(opts.dockerComposeFile)
  }
}

async function wait (containerName, onwait, attempt = 0) {
  try {
    await execFile(path.join(__dirname, 'bin', 'container-healthy'), [containerName])
  } catch (e) {
    attempt++
    await onwait(attempt)
    await wait(containerName, onwait, attempt)
  }
}

function DOCKER_COMPOSE (opts = {}) {
  return `---
version: '3'
services:
    ${opts.serviceName}:
        container_name: ${opts.containerName || opts.serviceName}
        image: ${opts.image}
        ports:
            - ${opts.hostPort}:${opts.containerPort}
        healthcheck:
            test: ["CMD", "pg_isready", "-d", "${opts.database}"]
        environment:
            - POSTGRES_PASSWORD=${opts.password}
            - POSTGRES_USER=${opts.user}
            - POSTGRES_DB=${opts.database}
  `
}
