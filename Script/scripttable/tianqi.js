// =============================================
//  主屏幕 · 大组件 ★ 修复偏左
// =============================================
function buildLarge(data) {
  const city = data.city, now = data.now, daily = data.daily
  const hourly = data.hourly, air = data.air
  const icon = getSFIcon(now.icon), desc = getWeatherDesc(now.icon)

  const w = new ListWidget()
  w.backgroundGradient = createBg(now.icon)
  w.setPadding(16, 14, 12, 14)
  w.url = "https://www.qweather.com/weather/" + city.id + ".html"

  // ========== 头部 ==========
  const header = w.addStack()
  header.layoutHorizontally(); header.centerAlignContent()
  const cn = header.addText(city.name); cn.font = Font.semiboldSystemFont(18); cn.textColor = Color.white()
  header.addSpacer(8)
  const dt = header.addText(formatDateFull()); dt.font = Font.regularSystemFont(12); dt.textColor = new Color("ffffff", 0.5)
  header.addSpacer()
  if (daily.length > 0) {
    const hl = header.addText("↑" + daily[0].tempMax + "° ↓" + daily[0].tempMin + "°")
    hl.font = Font.mediumSystemFont(14); hl.textColor = new Color("ffffff", 0.75)
  }

  // ========== 当前天气 ==========
  w.addSpacer(8)
  const cur = w.addStack(); cur.layoutHorizontally(); cur.centerAlignContent()
  const iv = cur.addImage(sfImage(icon, 48)); iv.imageSize = new Size(48, 48); cur.addSpacer(12)
  const ti = cur.addStack(); ti.layoutVertically()
  const tp = ti.addText(now.temp + "°"); tp.font = Font.boldRoundedSystemFont(50); tp.textColor = Color.white()
  tp.lineLimit = 1; tp.minimumScaleFactor = 0.5
  const dr = ti.addStack(); dr.layoutHorizontally(); dr.centerAlignContent()
  const ds = dr.addText(desc); ds.font = Font.regularSystemFont(14); ds.textColor = new Color("ffffff", 0.8)
  dr.addSpacer(8)
  const fl = dr.addText("体感" + now.feelsLike + "°"); fl.font = Font.regularSystemFont(10); fl.textColor = new Color("ffffff", 0.5)
  cur.addSpacer()
  const det = cur.addStack(); det.layoutVertically(); det.topAlignContent()
  addDetailRow(det, "humidity.fill", "湿度 " + now.humidity + "%"); det.addSpacer(3)
  addDetailRow(det, "wind", now.windDir + " " + now.windScale + "级"); det.addSpacer(3)
  addDetailRow(det, "eye.fill", "能见度 " + now.vis + "km"); det.addSpacer(3)
  addAQIRow(det, air)

  // ========== 逐小时预报 ★ 修复: 去掉固定列宽，spacer 均匀分布 ==========
  w.addSpacer(12)
  addSectionTitle(w, "24 小时预报")
  w.addSpacer(6)

  const hr = w.addStack()
  hr.layoutHorizontally()
  const hours = hourly.slice(0, 8)

  for (let i = 0; i < hours.length; i++) {
    if (i > 0) hr.addSpacer()
    const hCol = hr.addStack()
    hCol.layoutVertically()
    hCol.centerAlignContent()
    // ★ 不设 size，让 spacer 自动均分宽度

    const hTime = hCol.addText(formatHourLabel(hours[i].fxTime))
    hTime.font = Font.regularRoundedSystemFont(9)
    hTime.textColor = new Color("ffffff", 0.5)
    hTime.centerAlignText()
    hCol.addSpacer(2)
    const hIcon = hCol.addImage(sfImage(getSFIcon(hours[i].icon), 16))
    hIcon.imageSize = new Size(16, 16)
    hCol.addSpacer(2)
    const hTemp = hCol.addText(hours[i].temp + "°")
    hTemp.font = Font.mediumSystemFont(11)
    hTemp.textColor = Color.white()
    hTemp.centerAlignText()
  }
  hr.addSpacer() // ★ 尾部 spacer，和列间 spacer 等宽

  // ========== 分割线 ==========
  addDivider(w, 0.12)

  // ========== 7 日预报 ==========
  addSectionTitle(w, "7 日天气预报")
  w.addSpacer(6)

  let globalMin = Infinity, globalMax = -Infinity
  for (let j = 0; j < daily.length; j++) {
    const tMin = parseInt(daily[j].tempMin, 10), tMax = parseInt(daily[j].tempMax, 10)
    if (tMin < globalMin) globalMin = tMin
    if (tMax > globalMax) globalMax = tMax
  }

  const days = daily.slice(0, 7)
  const BAR_W = 90

  for (let k = 0; k < days.length; k++) {
    const row = w.addStack()
    row.layoutHorizontally()
    row.centerAlignContent()

    const dayLabel = row.addText(formatDayShort(days[k].fxDate))
    dayLabel.font = k === 0 ? Font.semiboldSystemFont(12) : Font.regularSystemFont(12)
    dayLabel.textColor = k === 0 ? Color.white() : new Color("ffffff", 0.85)
    dayLabel.lineLimit = 1

    row.addSpacer(8)
    const dIcon = row.addImage(sfImage(getSFIcon(days[k].iconDay), 14))
    dIcon.imageSize = new Size(14, 14)
    row.addSpacer(6)
    const dDesc = row.addText(getWeatherDesc(days[k].iconDay))
    dDesc.font = Font.regularSystemFont(10)
    dDesc.textColor = new Color("ffffff", 0.5)

    row.addSpacer()
    const lo = row.addText(days[k].tempMin + "°")
    lo.font = Font.regularSystemFont(12)
    lo.textColor = new Color("ffffff", 0.45)
    row.addSpacer(4)

    const bar = row.addImage(
      drawTempBar(parseInt(days[k].tempMin, 10), parseInt(days[k].tempMax, 10), globalMin, globalMax, BAR_W)
    )
    bar.imageSize = new Size(BAR_W, 6)

    row.addSpacer(4)
    const hi = row.addText(days[k].tempMax + "°")
    hi.font = Font.mediumSystemFont(12)
    hi.textColor = Color.white()

    if (k < days.length - 1) w.addSpacer(5)
  }

  return w
}
