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

  const header = []
  const theads = table.querySelectorAll('table > thead > tr > th')
  theads.forEach(th => {
    const item = th.innerText.replace(/(\r\n|\n|\r)/gm, "")
    header.push(item)
  });
  _worktime_data.push(header)

  const trows = table.querySelectorAll('table > tbody > tr')
  trows.forEach(tr => {
    const row = []
    let workmin = null
    let holiday = false
    let wipday = false
  
    const tdatas = tr.querySelectorAll('td')
    tdatas.forEach((td, key) => {
      let item = td.innerText.replace(/(\r\n|\n|\r)/gm, "")

      if (key === 1 && item) {  // 休日区分：休日出勤の判別のため取得
        holiday = true
      }

      if (key === 3 && item.match(/勤務中/)) {  // 退勤時間：勤務中判別のため取得
        wipday = true
        _contain_wipday = true
      }

      if (key === 4) {  // 勤務時間：次の残業時間計算のため取得
        if (item) {
          workmin = timeToMinutes(item)
        // } else if (!holiday) {  // 空欄で、かつ平日の場合(tableに表示)
        //   workmin = 0
        //   td.innerText = minutesToHoursMinutes(0)
        }
      }

      if (key === 5 && workmin !== null) {  // 残業時間
        let day_overmin = workmin - timeToMinutes('8:00')
        if (holiday) {  // 休日の場合は所定時間を引かない
          day_overmin = workmin
        }
        item = minutesToHoursMinutes(day_overmin)
        if (!td.innerText) {  // 空欄だったらtableに表示
          td.innerText = item
        }
        if (!wipday) {  // 退勤済の場合は月残業に加算
          _overworkMin += day_overmin
        }
      }

      if (key === 8) {  // 打刻詳細：改行が入ってめんどくさいので無視
        item = ''
      }

      row.push(item)
    })
    _worktime_data.push(row)
  })
}

function handleDownload() {
  let csvdata = ''
  _worktime_data.forEach(row => {
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

let _overworkMin = 0
let _contain_wipday = false
let _worktime_data = []

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
  const over45hMin = regularMin + (45 * 60)
  const over80hMin = regularMin + (80 * 60)
  const actualMin = statisticsMins['実労働時間']
  const regularWorkday = userInfo['所定労働日数'].match(/[0-9]{2}/)[0]
  const actualWorkday = basicInfo['実働日数']
  const titleYearMonth = userInfo['年月']
  const staffCode = userInfo['スタッフコード']
  
  getWorktimeTable()

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

  let remainWorkday = parseInt(regularWorkday, 10) - parseInt(actualWorkday, 10)
  if (remainWorkday < 0) {  // 所定勤務日数を超えている場合
    remainWorkday = 0
  } else {
    if (_contain_wipday) {  // 勤務中がある場合は残り日数に当日を加える
      remainWorkday += 1
    }
  }

  let aveMin = 0
  let ave45hMin = 0
  let ave80hMin = 0
  if (remainWorkday > 0) {
    aveMin    = Math.floor(remainMin    / remainWorkday)
    ave80hMin = Math.floor(remain80hMin / remainWorkday)
    ave45hMin = Math.floor(remain45hMin / remainWorkday)
  }

  // footer
  const f0 = _worktime_data.length + 1 // row idx
  const footer0 = ["今日までの合計", "", "", "", `=SUM(E2:E${f0-1})+$B$${f0+3}-$B$${f0+3}`, `=SUM(F2:F${f0-1})+$B$${f0+3}-$B$${f0+3}`, "", "", "", ""]
  const footer1 = ["残勤務日", `${remainWorkday}`]
  const footer2 = ["", "規定労働時間", "規定+45H", "規定+80H"]
  const footer3 = ["所定時間", `${minutesToHoursMinutes(regularMin)}`, `${minutesToHoursMinutes(over45hMin)}`, `${minutesToHoursMinutes(over80hMin)}`]
  const footer4 = ["残り時間", `=B${f0+3}-$E$${f0}`, `=C${f0+3}-$E$${f0}`, `=D${f0+3}-$E$${f0}`]
  const footer5 = ["1日平均", `=B${f0+4}/$B$${f0+1}`, `=C${f0+4}/$B$${f0+1}`, `=D${f0+4}/$B$${f0+1}`]
  _worktime_data.push(footer0)
  _worktime_data.push(footer1)
  _worktime_data.push(footer2)
  _worktime_data.push(footer3)
  _worktime_data.push(footer4)
  _worktime_data.push(footer5)

  new_card_body.innerHTML = `
    <table class="table jbc-table jbc-table-fixed info-contents">
      <tbody>
        ${makeTableRow("実働時間", [minutesToHoursMinutes(actualMin), '', ''])}
        ${makeTableRow("残業時間　※勤務中を除く", [minutesToHoursMinutes(_overworkMin), '', ''])}
        ${makeTableRow("残り日数", [remainWorkday, '', ''])}
        ${makeTableRow("規定時間", [minutesToHoursMinutes(regularMin), `${minutesToHoursMinutes(over45hMin)} (+45H)`, `${minutesToHoursMinutes(over80hMin)} (+80H)`])}
        ${makeTableRow("残り時間", [minutesToHoursMinutes(remainMin),minutesToHoursMinutes(remain45hMin), minutesToHoursMinutes(remain80hMin)])}
        ${makeTableRow("1日平均", [minutesToHoursMinutes(aveMin), minutesToHoursMinutes(ave45hMin), minutesToHoursMinutes(ave80hMin)])}
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
