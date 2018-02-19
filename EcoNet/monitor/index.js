const fetch = require('node-fetch')
const moment = require('moment')

var host = 'econet-api.rheemcert.com'

// Get credentials
var fs = require('fs')
var path = process.cwd()
var credentials = JSON.parse(fs.readFileSync(path + '/credentials.json'))

async function logStatus() {

  const loginRes = await (await fetch('https://' + host + '/auth/token', {
    method: 'POST',
    headers: {
      Accept: 'application/json, text/plain, */*',
      Authorization: 'Basic ' + credentials.authorization,
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
    },
      body: 'username=' + credentials.username
      + '&password=' + credentials.password + '&grant_type=password'
  })).json()

  const token = loginRes.access_token

  const equipRes = await (await fetch('https://' + host + '/equipment/' + credentials.id, {
    headers: {
      Accept: 'application/json, text/plain, */*',
      Authorization: 'Bearer ' + token
    },
  })).json()

  let log = moment().format()
  log += " - "
  log += equipRes.mode
  log += " - lower " + equipRes.lowerTemp.toFixed(2)
  log += " - upper " + equipRes.upperTemp.toFixed(2)
  log += " - ambient " + equipRes.ambientTemp.toFixed(2)
  log += " - "
  ;(["isLoadShiftOpted", "isLoadShedOpted", "isLoadShedActive", "isLoadShiftActive", "isEnabled", "isConnected", "isOnVacation", "hasCriticalAlert", "inUse"]).forEach(flag => {
    if (equipRes[flag]) {
      log += flag + ' '
    }
  })
  console.log(log)
}

logStatus()
setInterval(logStatus, 5 * 60 * 1000)
