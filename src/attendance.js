'use strict'

// h:m のような勤務時間を分に変換
function timeToMinutes (time) {
  const sign = time.startsWith('-') ? -1 : 1
  const [minute, hour] = time.match(/^-?(\d+):(\d+)$/).reverse()
  const minutes = sign * (parseInt(hour, 10) * 60 + parseInt(minute, 10))
  return minutes
}

function minutesToHoursMinutes (allMinutes) {
  const abs = Math.abs(allMinutes)
  const hours = Math.floor(abs / 60)
  const minutes = abs - hours * 60
  if (hours > 0) {
    return `${hours} 時間 ${minutes} 分`
  } else {
    return `${minutes} 分`
  }
}

function makeTableRow (title, data) {
  return `
  <tr>
    <th scope="row" class="jbc-text-sub">${title}</th>
    <td>
      <span class="info-content">${data}</span>
    </td>
  </tr>`
}

const new_jbc_card = document.createElement('div')
new_jbc_card.className = "card jbc-card-bordered h-100 mb-3"

const new_card_head = document.createElement('div')
new_card_head.className = "card-header jbc-card-header"
new_card_head.innerHTML = '<h5 class="card-text">[TEST] 残業カウンター</h5>'
new_jbc_card.append(new_card_head)

const new_card_body = document.createElement('div')
new_card_body.className = "card-body"
new_jbc_card.append(new_card_body)

const searchResult = document.querySelector('#search-result')
const workRecordTable = document.querySelector('#search-result > div.table-responsive')
searchResult.insertBefore(new_jbc_card, workRecordTable)

try {
  // ユーザー情報
  const userInfoTBody = document.querySelector('#search-result > div.row > div:nth-child(1) > div.card > div.card-body > table > tbody')
  const userInfo = Array
  .from(userInfoTBody.querySelectorAll('tr'))
  .reduce((acc, e) => {
    acc[e.querySelector('th').innerText] = e.querySelector('td').innerText
    return acc
  }, {})

  // 基本項目
  const basicInfoTBody = document.querySelector('#search-result > div.row > div:nth-child(2) > div.card > div.card-body > table > tbody')
  const basicInfo = Array
  .from(basicInfoTBody.querySelectorAll('tr'))
  .reduce((acc, e) => {
    acc[e.querySelector('th').innerText] = e.querySelector('td').innerText
    return acc
  }, {})

  // 労働時間
  const statisticsTBody = document.querySelector('#search-result > div.row > div:nth-child(3) > div.card > div.card-body > table > tbody')
  const statisticsMins = Array
    .from(statisticsTBody.querySelectorAll('tr'))
    .reduce((acc, e) => {
      acc[e.querySelector('th').innerText] = timeToMinutes(e.querySelector('td').innerText)
      return acc
    }, {})
  
  const regularMin = statisticsMins['月規定労働時間']
  const actualMin = statisticsMins['実労働時間']
  const overworkMin = statisticsMins['実残業時間']
  const regularWorkday = userInfo['所定労働日数'].match(/[0-9]{2}/)[0]
  const actualWorkday = basicInfo['実働日数']

  const remainMin = regularMin - actualMin

  const over45hMin = regularMin + (45 * 60)
  const over80hMin = regularMin + (80 * 60)
  const remain45hMin = over45hMin - actualMin
  const remain80hMin = over80hMin - actualMin

  const remainWorkday = parseInt(regularWorkday, 10) - parseInt(actualWorkday, 10)
  let ave45hMin = 0
  let ave80hMin = 0
  if (remainWorkday != 0) {
    ave80hMin = Math.floor(remain80hMin / remainWorkday)
    ave45hMin = Math.floor(remain45hMin / remainWorkday)
  }

  new_card_body.innerHTML = `
    <table class="table jbc-table jbc-table-fixed info-contents">
      <tbody>
        ${makeTableRow("規定労働時間", minutesToHoursMinutes(regularMin))}
        ${makeTableRow("実働時間", minutesToHoursMinutes(actualMin))}
        ${makeTableRow("残業時間", minutesToHoursMinutes(overworkMin))}
        ${makeTableRow("規定時間まで残り", minutesToHoursMinutes(remainMin))}
        ${makeTableRow("残業45H超過まで残り", minutesToHoursMinutes(remain45hMin))}
        ${makeTableRow("残業80H超過まで残り", minutesToHoursMinutes(remain80hMin))}
        ${makeTableRow("残り勤務日数", remainWorkday + ' 日')}
        ${makeTableRow("残業45H以内 1日平均", minutesToHoursMinutes(ave45hMin))}
        ${makeTableRow("残業80H以内 1日平均", minutesToHoursMinutes(ave80hMin))}
      </tbody>
    </table>`

} catch (e) {
  console.error(e)
  new_card_body.innerText = e
}
