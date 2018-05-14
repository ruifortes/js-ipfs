'use strict'

const fs = require('fs')
const os = require('os')
const multiaddr = require('multiaddr')
const path = require('path')
const debug = require('debug')
const log = debug('cli')
log.error = debug('cli:error')
const Progress = require('progress')
const byteman = require('byteman')

exports = module.exports

exports.isDaemonOn = isDaemonOn
function isDaemonOn () {
  try {
    fs.readFileSync(path.join(exports.getRepoPath(), 'api'))
    log('daemon is on')
    return true
  } catch (err) {
    log('daemon is off')
    return false
  }
}

exports.getAPICtl = getAPICtl
function getAPICtl (apiAddr) {
  if (!apiAddr && !isDaemonOn()) {
    throw new Error('daemon is not on')
  }
  if (!apiAddr) {
    const apiPath = path.join(exports.getRepoPath(), 'api')
    apiAddr = multiaddr(fs.readFileSync(apiPath).toString()).toString()
  }
  // Required inline to reduce startup time
  const APIctl = require('ipfs-api')
  return APIctl(apiAddr)
}

exports.getNodeOrAPI = (argv, stateOptions = {forceInitialized: true}) => {
  log('get node or api async')
  if (argv.api || isDaemonOn()) {
    return Promise.resolve(getAPICtl(argv.api))
  }

  const IPFS = require('../core')
  return IPFS.createNodePromise({
    repo: exports.getRepoPath(),
    init: false,
    start: false,
    pass: argv.pass,
    EXPERIMENTAL: {
      pubsub: true
    }
  }, stateOptions)
}

exports.getRepoPath = () => {
  return process.env.IPFS_PATH || os.homedir() + '/.jsipfs'
}

let visible = true
exports.disablePrinting = (silent) => {
  visible = !silent
  return silent
}

exports.print = (msg, newline) => {
  if (newline === undefined) {
    newline = true
  }

  if (visible) {
    if (msg === undefined) {
      msg = ''
    }
    msg = newline ? msg + '\n' : msg
    process.stdout.write(msg)
  }
}

exports.createProgressBar = (totalBytes) => {
  const total = byteman(totalBytes, 2, 'MB')
  const barFormat = `:progress / ${total} [:bar] :percent :etas`

  // 16 MB / 34 MB [===========             ] 48% 5.8s //
  return new Progress(barFormat, {
    incomplete: ' ',
    clear: true,
    stream: process.stdout,
    total: totalBytes
  })
}

exports.rightpad = (val, n) => {
  let result = String(val)
  for (let i = result.length; i < n; ++i) {
    result += ' '
  }
  return result
}

exports.ipfsPathHelp = 'ipfs uses a repository in the local file system. By default, the repo is ' +
  'located at ~/.jsipfs. To change the repo location, set the $IPFS_PATH environment variable:\n\n' +
  'export IPFS_PATH=/path/to/ipfsrepo\n'
