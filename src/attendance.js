'use strict'

// h:m のような勤務時間を分に変換
function timeToMinutes (time) {
  const sign = time.startsWith('-') ? -1 : 1
  const [minute, hour] = time.match(/^-?(\d+):(\d+)$/).reverse()
  const minutes = sign * (parseInt(hour, 10) * 60 + parseInt(minute, 10))
  return minutes
}

function minutesToHoursMinutes (allMinutes) {
  let hm_str = ''
  if (allMinutes < 0) {
    hm_str = '-'
  }
  const abs = Math.abs(allMinutes)
  const hours = Math.floor(abs / 60)
  const minutes = abs - hours * 60
  hm_str += `${hours}:`
  hm_str += `0${minutes}`.slice(-2)
  return hm_str
}

function makeTableRow (title, colums) {
  let innerHTML = `<tr><th scope="row" class="jbc-text-sub">${title}</th>`
  colums.forEach(colum => {
    innerHTML += `<td><span class="info-content">${colum}</span></td>`
  });
  innerHTML += `</tr>`
  return innerHTML
}

function getWorktimeTable() {
  const table = document.querySelector('#search-result > div.table-responsive > table')
  const data = []

  const header = []
  const theads = table.querySelectorAll('table > thead > tr > th')
  theads.forEach(th => {
    const item = th.innerText.replace(/(\r\n|\n|\r)/gm, "")
    header.push(item)
  });
  data.push(header)

  const trows = table.querySelectorAll('table > tbody > tr')
  trows.forEach(tr => {
    const row = []
    let workmin = null
    let holiday = false
    const tdatas = tr.querySelectorAll('td')
    tdatas.forEach((td, key) => {
      let item = td.innerText.replace(/(\r\n|\n|\r)/gm, "")
      if (item && key === 1) {  // 休日区分：休日出勤の判別のため取得
        holiday = true
      }
      if (item && key === 4) {  // 勤務時間：次の残業時間計算のため取得
        workmin = timeToMinutes(item)
      }
      if (workmin && key === 5) {  // 残業時間：一日ごとに-8:00して入力
        let overmin = workmin - timeToMinutes('8:00')
        if (holiday) { // 休日出勤の場合は勤務時間をすべて残業時間に加算
          overmin = workmin
        }
        item = minutesToHoursMinutes(overmin)
        if (!td.innerText) {  //（空欄だったらtableに表示）
          td.innerText = item
        }
      }
      if (key === 8) {  // 打刻詳細：改行が入ってめんどくさいので無視
        item = ''
      }
      row.push(item)
    })
    data.push(row)
  })

  // footer
  const f0 = data.length + 1 // row idx
  const footer0 = ["合計", "", "", "", `=SUM(E2:E${f0-1})+$B$${f0+3}-$B$${f0+3}`, `=SUM(F2:F${f0-1})+$B$${f0+3}-$B$${f0+3}`, `=SUM(G2:G${f0-1})+$B$${f0+3}-$B$${f0+3}`, `=SUM(H2:H${f0-1})+$B$${f0+3}-$B$${f0+3}`, "", ""]
  const footer1 = ["残勤務日", `${remainWorkday}`]
  const footer2 = ["", "規定労働時間", "規定+45H", "規定+80H"]
  const footer3 = ["所定時間", `${minutesToHoursMinutes(regularMin)}`, `${minutesToHoursMinutes(over45hMin)}`, `${minutesToHoursMinutes(over80hMin)}`]
  const footer4 = ["残り時間", `=B${f0+3}-$E$${f0}`, `=C${f0+3}-$E$${f0}`, `=D${f0+3}-$E$${f0}`]
  const footer5 = ["1日平均", `=B${f0+4}/$B$${f0+1}`, `=C${f0+4}/$B$${f0+1}`, `=D${f0+4}/$B$${f0+1}`]
  data.push(footer0)
  data.push(footer1)
  data.push(footer2)
  data.push(footer3)
  data.push(footer4)
  data.push(footer5)

  return data
}

function handleDownload() {
  let csvdata = ''
  const data = getWorktimeTable()
  data.forEach(row => {
    let colstr = ''
    row.forEach(col => {
      colstr += col + ','
    });
    csvdata += colstr + '\n'
  });
  var bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
  var blob = new Blob([ bom, csvdata ], { "type" : "text/csv" });
  document.getElementById("download_csv").href = window.URL.createObjectURL(blob);
}

const new_jbc_card = document.createElement('div')
new_jbc_card.className = "card jbc-card-bordered h-100 mb-3"

const new_card_head = document.createElement('div')
new_card_head.className = "card-header jbc-card-header"
new_card_head.innerHTML = '<h5 class="card-text">残業時間 (拡張)</h5>'
new_jbc_card.append(new_card_head)

const new_card_body = document.createElement('div')
new_card_body.className = "card-body"
new_jbc_card.append(new_card_body)

const searchResult = document.querySelector('#search-result')
const workRecordTable = document.querySelector('#search-result > div.table-responsive')
searchResult.insertBefore(new_jbc_card, workRecordTable)

let regularMin = 0
let over45hMin = 0
let over80hMin = 0
let remainWorkday = 0

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
  
  regularMin = statisticsMins['月規定労働時間']
  over45hMin = regularMin + (45 * 60)
  over80hMin = regularMin + (80 * 60)
  const actualMin = statisticsMins['実労働時間']
  const regularWorkday = userInfo['所定労働日数'].match(/[0-9]{2}/)[0]
  const actualWorkday = basicInfo['平日出勤日数']
  const titleYearMonth = userInfo['年月']
  const staffCode = userInfo['スタッフコード']
  
  const overworkMin = actualMin - (actualWorkday * 8 * 60)

  let remainMin = regularMin - actualMin
  let remain45hMin = over45hMin - actualMin
  let remain80hMin = over80hMin - actualMin
  if (remainMin < 0) {
    remainMin = 0
  }
  if (remain45hMin < 0) {
    remain45hMin = 0
  }
  if (remain80hMin < 0) {
    remain80hMin = 0
  }

  remainWorkday = parseInt(regularWorkday, 10) - parseInt(actualWorkday, 10)
  let aveMin = 0
  let ave45hMin = 0
  let ave80hMin = 0
  if (remainWorkday > 0) {
    aveMin    = Math.floor(remainMin    / remainWorkday)
    ave80hMin = Math.floor(remain80hMin / remainWorkday)
    ave45hMin = Math.floor(remain45hMin / remainWorkday)
  } else {
    remainWorkday = 0
  }

  getWorktimeTable() // 残業時間表示のため

  new_card_body.innerHTML = `
    <table class="table jbc-table jbc-table-fixed info-contents">
      <tbody>
        ${makeTableRow("実働時間", [minutesToHoursMinutes(actualMin), '', ''])}
        ${makeTableRow("残業時間", [minutesToHoursMinutes(overworkMin), '', ''])}
        ${makeTableRow("残り日数　※今日を除く", [remainWorkday, '', ''])}
        ${makeTableRow("規定時間", [minutesToHoursMinutes(regularMin), `${minutesToHoursMinutes(over45hMin)} (+45H)`, `${minutesToHoursMinutes(over80hMin)} (+80H)`])}
        ${makeTableRow("残り時間", [minutesToHoursMinutes(remainMin),minutesToHoursMinutes(remain45hMin), minutesToHoursMinutes(remain80hMin)])}
        ${makeTableRow("1日平均　※今日を除く", [minutesToHoursMinutes(aveMin), minutesToHoursMinutes(ave45hMin), minutesToHoursMinutes(ave80hMin)])}
      </tbody>
    </table>
  `

  const btn_row = document.createElement("div")
  btn_row.className = "card-text text-right"
  new_card_body.append(btn_row)

  const csv_button = document.createElement("a")
  csv_button.id = "download_csv"
  csv_button.className = "btn jbc-btn-outline-primary"
  csv_button.innerText = "CSVダウンロード"
  csv_button.download = `${titleYearMonth}_${staffCode}.csv`
  csv_button.href = "#"
  csv_button.onclick = handleDownload
  btn_row.append(csv_button)

} catch (e) {
  console.error(e)
  new_card_body.innerText = e
}
