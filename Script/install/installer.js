// ==========================================
//  installer.js — 远程安装器
//  包含多个脚本源码，一键安装到 Scriptable
// ==========================================

Script.Installer = async function () {

  // =============================================
  //  脚本注册表 · 在这里添加你要分发的脚本
  // =============================================
  var SCRIPTS = [
    {
      name: "天气小组件",
      fileName: "天气小组件",
      desc: "和风天气 · SF Symbols · 空气质量 · 多城市 · 锁屏",
      code: WEATHER_WIDGET_CODE   // 定义在下方
    },
    {
      name: "电量小组件",
      fileName: "电量小组件",
      desc: "电池电量 · 充电状态 · 设备信息",
      code: BATTERY_WIDGET_CODE
    },
    {
      name: "倒数日小组件",
      fileName: "倒数日小组件",
      desc: "纪念日 · 倒计时 · 自定义事件",
      code: COUNTDOWN_WIDGET_CODE
    }
  ]

  // =============================================
  //  安装逻辑
  // =============================================
  var fm = FileManager.iCloud()
  var dir = fm.documentsDirectory()

  // 主菜单
  while (true) {
    var main = new Alert()
    main.title = "脚本安装器"
    main.message = "选择要安装的脚本（共 " + SCRIPTS.length + " 个）"

    for (var i = 0; i < SCRIPTS.length; i++) {
      var exists = fm.fileExists(fm.joinPath(dir, SCRIPTS[i].fileName + ".js"))
      var prefix = exists ? "🔄 " : "📦 "
      main.addAction(prefix + SCRIPTS[i].name)
    }
    main.addAction("⚡ 一键全部安装")
    main.addDestructiveAction("🗑 全部卸载")
    main.addCancelAction("退出")

    var choice = await main.presentAlert()

    // 退出
    if (choice === -1) {
      Script.complete()
      return
    }

    // 一键全部安装
    if (choice === SCRIPTS.length) {
      var count = 0
      for (var k = 0; k < SCRIPTS.length; k++) {
        var ok = installOne(fm, dir, SCRIPTS[k])
        if (ok) count++
      }
      await showDone("安装完成", "已安装 " + count + " 个脚本到 Scriptable")
      continue
    }

    // 全部卸载
    if (choice === SCRIPTS.length + 1) {
      var confirm = new Alert()
      confirm.title = "确认卸载？"
      confirm.message = "将删除所有已安装的脚本"
      confirm.addDestructiveAction("确认卸载")
      confirm.addCancelAction("取消")
      var c2 = await confirm.presentAlert()
      if (c2 === -1) continue
      var delCount = 0
      for (var d = 0; d < SCRIPTS.length; d++) {
        var p = fm.joinPath(dir, SCRIPTS[d].fileName + ".js")
        if (fm.fileExists(p)) { fm.remove(p); delCount++ }
      }
      await showDone("卸载完成", "已删除 " + delCount + " 个脚本")
      continue
    }

    // 单个脚本详情
    if (choice < SCRIPTS.length) {
      await showScriptDetail(fm, dir, SCRIPTS[choice])
    }
  }

  // =============================================
  //  安装单个脚本
  // =============================================
  function installOne(fm, dir, script) {
    try {
      var path = fm.joinPath(dir, script.fileName + ".js")
      fm.writeString(path, script.code)
      return true
    } catch (e) {
      return false
    }
  }

  // =============================================
  //  脚本详情页
  // =============================================
  async function showScriptDetail(fm, dir, script) {
    var path = fm.joinPath(dir, script.fileName + ".js")
    var exists = fm.fileExists(path)

    var detail = new Alert()
    detail.title = script.name
    detail.message = script.desc
      + "\n\n文件: " + script.fileName + ".js"
      + (exists ? "\n状态: ✅ 已安装" : "\n状态: ⬜ 未安装")

    if (exists) {
      detail.addAction("🔄 覆盖安装")
      detail.addDestructiveAction("🗑 卸载此脚本")
    } else {
      detail.addAction("📦 安装")
    }
    detail.addCancelAction("返回")

    var choice = await detail.presentAlert()
    if (choice === -1) return

    // 卸载
    if (exists && choice === 1) {
      fm.remove(path)
      await showDone("已卸载", script.name + " 已删除")
      return
    }

    // 安装
    var ok = installOne(fm, dir, script)
    if (ok) {
      await showDone("安装成功", script.name + " 已安装到 Scriptable\n\n"
        + "你可以在脚本列表中找到它，\n也可以长按桌面添加为小组件。")
    } else {
      await showError("安装失败", "写入文件时出错，请重试")
    }
  }

  // =============================================
  //  提示工具
  // =============================================
  async function showDone(title, msg) {
    var a = new Alert()
    a.title = title
    a.message = msg
    a.addAction("确定")
    await a.presentAlert()
  }

  async function showError(title, msg) {
    var a = new Alert()
    a.title = title
    a.message = msg
    a.addAction("确定")
    await a.presentAlert()
  }
}


// ============================================================
// ============================================================
//
//  以下为各脚本的完整源码（字符串模板）
//
// ============================================================
// ============================================================


// ==========================================
//  天气小组件源码
// ==========================================
var WEATHER_WIDGET_CODE = `
"use strict"

// —————————————— 配置 ——————————————
var API_HOST  = "mx4nmt4abk.re.qweatherapi.com"
var CACHE_TTL = 30 * 60 * 1000

var fm         = FileManager.local()
var configPath = fm.joinPath(fm.documentsDirectory(), "qw_config.json")
var cachePath  = fm.joinPath(fm.cacheDirectory(), "qw_cache.json")

// —————————————— 天气描述 ——————————————
var WD = Object.freeze({
  "100": "晴", "101": "多云", "102": "少云", "103": "晴间多云", "104": "阴",
  "150": "晴", "151": "晴", "153": "晴",
  "300": "阵雨", "301": "阵雨", "302": "雷阵雨", "303": "雷阵雨", "304": "雷阵雨",
  "305": "小雨", "306": "中雨", "307": "大雨", "308": "暴雨", "309": "毛毛雨",
  "310": "暴雨", "311": "大暴雨", "312": "特大暴雨", "313": "冻雨",
  "314": "小到中雨", "315": "中到大雨", "316": "大到暴雨",
  "317": "暴雨到大暴雨", "318": "大暴雨到特大暴雨", "399": "雨",
  "400": "小雪", "401": "中雪", "402": "大雪", "403": "暴雪",
  "404": "雨夹雪", "405": "雨夹雪", "406": "雨夹雪",
  "407": "阵雪", "408": "阵雪", "409": "阵雪", "410": "小到中雪", "499": "雪",
  "500": "薄雾", "501": "雾", "502": "霾", "503": "扬沙", "504": "浮尘",
  "507": "沙尘暴", "508": "强沙尘暴", "509": "浓雾", "510": "强浓雾",
  "511": "中度霾", "512": "重度霾", "513": "严重霾", "514": "大雾", "515": "特强浓雾",
  "900": "热", "901": "冷"
})

function aqiInfo(aqi) {
  var a = parseInt(aqi, 10) || 0
  if (a <= 50)  return { category: "优",   color: new Color("#4ade80") }
  if (a <= 100) return { category: "良",   color: new Color("#fbbf24") }
  if (a <= 150) return { category: "轻度", color: new Color("#fb923c") }
  if (a <= 200) return { category: "中度", color: new Color("#ef4444") }
  if (a <= 300) return { category: "重度", color: new Color("#c026d3") }
  return              { category: "严重", color: new Color("#991b1b") }
}

function isNight() {
  var h = new Date().getHours()
  return h < 6 || h >= 19
}

function getSFIcon(code) {
  var night = isNight()
  var c = parseInt(code, 10)
  if (c === 100)                    return night ? "moon.stars.fill"      : "sun.max.fill"
  if (c >= 150 && c <= 153)         return "moon.stars.fill"
  if ([101, 102, 103].includes(c))  return night ? "cloud.moon.fill"      : "cloud.sun.fill"
  if (c === 104)                    return "cloud.fill"
  if ([300, 301].includes(c))       return night ? "cloud.moon.rain.fill" : "cloud.sun.rain.fill"
  if ([302, 303, 304].includes(c))  return "cloud.bolt.rain.fill"
  if ([305, 309, 399].includes(c))  return "cloud.drizzle.fill"
  if ([306, 314, 315].includes(c))  return "cloud.rain.fill"
  if (c >= 307 && c <= 312)         return "cloud.heavyrain.fill"
  if (c === 313)                    return "cloud.sleet.fill"
  if (c >= 316 && c <= 318)         return "cloud.heavyrain.fill"
  if (c >= 400 && c <= 403)         return "cloud.snow.fill"
  if ([404, 405, 406].includes(c))  return "cloud.sleet.fill"
  if (c >= 407 && c <= 499)         return "cloud.snow.fill"
  if (c >= 500 && c <= 515)         return "cloud.fog.fill"
  if (c === 900)                    return "thermometer.sun.fill"
  if (c === 901)                    return "thermometer.snowflake"
  return "cloud.fill"
}

function getWeatherDesc(code) { return WD[code] || "未知" }

function sfImage(name, size) {
  try {
    var sym = SFSymbol.named(name)
    sym.applyFont(Font.boldSystemFont(size))
    return sym.image
  } catch (e) {
    var fallback = SFSymbol.named("cloud.fill")
    fallback.applyFont(Font.boldSystemFont(size))
    return fallback.image
  }
}

function sfImageLight(name, size) {
  try {
    var sym = SFSymbol.named(name)
    sym.applyFont(Font.regularSystemFont(size))
    return sym.image
  } catch (e) { return null }
}

var WEEKDAY_SHORT = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"]
var WEEKDAY_FULL  = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"]

function formatDayShort(dateStr) {
  var d = new Date(dateStr + "T00:00:00")
  var today = new Date(); today.setHours(0, 0, 0, 0)
  if (d.getTime() === today.getTime()) return "今天"
  var tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)
  if (d.getTime() === tomorrow.getTime()) return "明天"
  return WEEKDAY_SHORT[d.getDay()]
}

function formatHourLabel(fxTime) {
  try {
    var h = parseInt(fxTime.split("T")[1].split(":")[0], 10)
    if (h === new Date().getHours()) return "现在"
    return String(h).padStart(2, "0") + ":00"
  } catch (e) { return "--" }
}

function formatDateShort() {
  var d = new Date()
  return (d.getMonth() + 1) + "/" + d.getDate() + " " + WEEKDAY_SHORT[d.getDay()]
}

function formatDateFull() {
  var d = new Date()
  return (d.getMonth() + 1) + "月" + d.getDate() + "日 " + WEEKDAY_FULL[d.getDay()]
}

function createBg(code) {
  var night = isNight()
  var c = parseInt(code, 10)
  var g = new LinearGradient()
  if (c === 100 || (c >= 150 && c <= 153))
    g.colors = night ? [new Color("#0B1026"), new Color("#1B2559")] : [new Color("#1565C0"), new Color("#64B5F6")]
  else if ([101, 102, 103].includes(c))
    g.colors = night ? [new Color("#121828"), new Color("#2C3A5C")] : [new Color("#546E7A"), new Color("#90A4AE")]
  else if (c === 104)
    g.colors = night ? [new Color("#1A1A2E"), new Color("#3D3D5C")] : [new Color("#607D8B"), new Color("#90A4AE")]
  else if (c >= 300 && c < 400)
    g.colors = night ? [new Color("#0D1117"), new Color("#21262D")] : [new Color("#263238"), new Color("#546E7A")]
  else if (c >= 400 && c < 500)
    g.colors = night ? [new Color("#1B2838"), new Color("#3D5166")] : [new Color("#607D8B"), new Color("#B0BEC5")]
  else if (c >= 500)
    g.colors = night ? [new Color("#2D2D2D"), new Color("#4D4D4D")] : [new Color("#757575"), new Color("#BDBDBD")]
  else
    g.colors = night ? [new Color("#0F0C29"), new Color("#302B63")] : [new Color("#2C3E50"), new Color("#5DADE2")]
  g.locations = [0, 1]; g.startPoint = new Point(0, 0); g.endPoint = new Point(1, 1)
  return g
}

function drawTempBar(minTemp, maxTemp, globalMin, globalMax, barWidth) {
  var ctx = new DrawContext()
  ctx.size = new Size(barWidth, 6); ctx.opaque = false
  var track = new Path(); track.addRoundedRect(new Rect(0, 0, barWidth, 6), 3, 3)
  ctx.addPath(track); ctx.setFillColor(new Color("ffffff", 0.12)); ctx.fillPath()
  var range = globalMax - globalMin || 1
  var startX = ((minTemp - globalMin) / range) * barWidth
  var barLen = Math.max(((maxTemp - globalMin) / range) * barWidth - startX, 8)
  var bar = new Path(); bar.addRoundedRect(new Rect(startX, 0, barLen, 6), 3, 3)
  ctx.addPath(bar); ctx.setFillColor(new Color("ffffff", 0.55)); ctx.fillPath()
  return ctx.getImage()
}

function drawAQIRing(value, size) {
  try {
    var ctx = new DrawContext(); ctx.size = new Size(size, size); ctx.opaque = false
    var cx = size / 2, cy = size / 2, r = size / 2 - 3, lw = 3
    ctx.setStrokeColor(new Color("ffffff", 0.15)); ctx.setLineWidth(lw)
    var bg = new Path(); bg.addArc(new Point(cx, cy), r, 0, 360)
    ctx.addPath(bg); ctx.strokePath()
    var a = Math.min(Math.max(parseInt(value, 10) || 0, 0), 500)
    ctx.setStrokeColor(aqiInfo(value).color); ctx.setLineWidth(lw)
    var fg = new Path(); fg.addArc(new Point(cx, cy), r, 270, 270 + (a / 500) * 360)
    ctx.addPath(fg); ctx.strokePath()
    return ctx.getImage()
  } catch (e) { return null }
}

function drawDot(color, size) {
  var ctx = new DrawContext(); ctx.size = new Size(size, size); ctx.opaque = false
  var p = new Path(); p.addEllipse(new Rect(0, 0, size, size))
  ctx.addPath(p); ctx.setFillColor(color); ctx.fillPath()
  return ctx.getImage()
}

function addDetailRow(stack, iconName, text) {
  var row = stack.addStack(); row.layoutHorizontally(); row.centerAlignContent()
  var img = sfImageLight(iconName, 10)
  if (img) { var iv = row.addImage(img); iv.imageSize = new Size(10, 10); row.addSpacer(3) }
  var label = row.addText(text); label.font = Font.regularSystemFont(11)
  label.textColor = new Color("ffffff", 0.6)
}

function addAQIRow(stack, air) {
  if (!air) return
  var info = aqiInfo(air.aqi)
  var row = stack.addStack(); row.layoutHorizontally(); row.centerAlignContent()
  var dot = row.addImage(drawDot(info.color, 6)); dot.imageSize = new Size(6, 6); row.addSpacer(3)
  var label = row.addText("AQI " + air.aqi + " " + info.category)
  label.font = Font.regularSystemFont(11); label.textColor = new Color("ffffff", 0.6)
}

function addSectionTitle(stack, text) {
  var row = stack.addStack()
  var label = row.addText(text); label.font = Font.mediumSystemFont(11)
  label.textColor = new Color("ffffff", 0.35)
}

function addDivider(stack, opacity) {
  stack.addSpacer(10)
  var bar = stack.addStack(); bar.backgroundColor = new Color("ffffff", opacity || 0.12)
  bar.size = new Size(0, 0.5); stack.addSpacer(10)
}

function loadConfig() {
  try {
    if (!fm.fileExists(configPath)) return null
    var c = JSON.parse(fm.readString(configPath))
    if (c && c.apiKey && c.cityName && !c.cities) {
      var migrated = { apiKey: c.apiKey, cities: [{ name: c.cityName, id: c.cityId || "" }], active: 0 }
      saveConfig(migrated); return migrated
    }
    if (c && c.apiKey && Array.isArray(c.cities) && c.cities.length > 0) {
      if (typeof c.active !== "number" || c.active >= c.cities.length) c.active = 0
      return c
    }
  } catch (e) {}
  return null
}

function saveConfig(cfg) { try { fm.writeString(configPath, JSON.stringify(cfg)) } catch (e) {} }

function loadCache(apiKey, cityId) {
  try {
    if (!fm.fileExists(cachePath)) return null
    var c = JSON.parse(fm.readString(cachePath))
    if (c.apiKey !== apiKey || c.cityId !== cityId) return null
    if (typeof c.ts !== "number" || Date.now() - c.ts > CACHE_TTL) return null
    return c.data
  } catch (e) { return null }
}

function saveCache(apiKey, cityId, data) {
  try { fm.writeString(cachePath, JSON.stringify({ apiKey: apiKey, cityId: cityId, ts: Date.now(), data: data })) } catch (e) {}
}

function clearCache() { try { if (fm.fileExists(cachePath)) fm.remove(cachePath) } catch (e) {} }

async function apiRequest(path, apiKey) {
  var sep = path.includes("?") ? "&" : "?"
  var url = "https://" + API_HOST + path + sep + "key=" + apiKey
  var req = new Request(url); req.timeoutInterval = 15
  return await req.loadJSON()
}

async function lookupCity(name, apiKey) {
  var data = await apiRequest("/geo/v2/city/lookup?location=" + encodeURIComponent(name), apiKey)
  if (data.code === "200" && Array.isArray(data.location) && data.location.length > 0) return data.location[0]
  return null
}

async function fetchNow(id, apiKey) {
  var data = await apiRequest("/v7/weather/now?location=" + id, apiKey)
  return data.code === "200" ? data.now : null
}

async function fetchDaily(id, apiKey) {
  var data = await apiRequest("/v7/weather/7d?location=" + id, apiKey)
  return data.code === "200" && Array.isArray(data.daily) ? data.daily : []
}

async function fetchHourly(id, apiKey) {
  var data = await apiRequest("/v7/weather/24h?location=" + id, apiKey)
  return data.code === "200" && Array.isArray(data.hourly) ? data.hourly : []
}

async function fetchAir(id, apiKey) {
  try { var data = await apiRequest("/v7/air/now?location=" + id, apiKey)
    return data.code === "200" && data.now ? data.now : null } catch (e) { return null }
}

async function fetchAll(cfg) {
  var cityEntry = cfg.cities[cfg.active]; var cityId = cityEntry.id
  if (cityId) { var cached = loadCache(cfg.apiKey, cityId); if (cached) return cached }
  var cityInfo = await lookupCity(cityEntry.name, cfg.apiKey)
  if (!cityInfo) throw new Error("无法找到城市「" + cityEntry.name + "」")
  if (cityInfo.id !== cityId) {
    cfg.cities[cfg.active].id = cityInfo.id; cfg.cities[cfg.active].name = cityInfo.name
    saveConfig(cfg); cityId = cityInfo.id
  }
  var cached2 = loadCache(cfg.apiKey, cityId); if (cached2) return cached2
  var results = await Promise.all([fetchNow(cityId, cfg.apiKey), fetchDaily(cityId, cfg.apiKey),
    fetchHourly(cityId, cfg.apiKey), fetchAir(cityId, cfg.apiKey)])
  if (!results[0]) throw new Error("无法获取天气数据")
  var payload = { city: cityInfo, now: results[0], daily: results[1], hourly: results[2], air: results[3] }
  saveCache(cfg.apiKey, cityId, payload); return payload
}

function buildSmall(data) {
  var city = data.city, now = data.now, daily = data.daily
  var icon = getSFIcon(now.icon), desc = getWeatherDesc(now.icon)
  var w = new ListWidget(); w.backgroundGradient = createBg(now.icon)
  w.setPadding(12, 16, 12, 16)
  w.url = "https://www.qweather.com/weather/" + city.id + ".html"
  var header = w.addStack(); header.layoutHorizontally()
  var cityName = header.addText(city.name); cityName.font = Font.mediumSystemFont(14); cityName.textColor = Color.white()
  header.addSpacer()
  var dateLabel = header.addText(formatDateShort()); dateLabel.font = Font.regularSystemFont(11)
  dateLabel.textColor = new Color("ffffff", 0.6)
  w.addSpacer()
  var mainRow = w.addStack(); mainRow.layoutHorizontally(); mainRow.centerAlignContent()
  var iconView = mainRow.addImage(sfImage(icon, 44)); iconView.imageSize = new Size(44, 44)
  mainRow.addSpacer(8)
  var tempCol = mainRow.addStack(); tempCol.layoutVertically()
  var tempText = tempCol.addText(now.temp + "°"); tempText.font = Font.boldRoundedSystemFont(48)
  tempText.textColor = Color.white(); tempText.lineLimit = 1; tempText.minimumScaleFactor = 0.5
  var descText = tempCol.addText(desc); descText.font = Font.regularSystemFont(14); descText.textColor = new Color("ffffff", 0.8)
  w.addSpacer()
  var footer = w.addStack(); footer.layoutHorizontally()
  if (daily.length > 0) {
    var highLow = footer.addText("↑" + daily[0].tempMax + "° ↓" + daily[0].tempMin + "°")
    highLow.font = Font.regularSystemFont(12); highLow.textColor = new Color("ffffff", 0.75)
  }
  footer.addSpacer()
  var windText = footer.addText(now.windDir + " " + now.windScale + "级")
  windText.font = Font.regularSystemFont(10); windText.textColor = new Color("ffffff", 0.55)
  return w
}

function buildMedium(data) {
  var city = data.city, now = data.now, daily = data.daily, hourly = data.hourly, air = data.air
  var icon = getSFIcon(now.icon), desc = getWeatherDesc(now.icon)
  var w = new ListWidget(); w.backgroundGradient = createBg(now.icon)
  w.setPadding(14, 18, 14, 18)
  w.url = "https://www.qweather.com/weather/" + city.id + ".html"
  var topRow = w.addStack(); topRow.layoutHorizontally(); topRow.centerAlignContent()
  var iconView = topRow.addImage(sfImage(icon, 36)); iconView.imageSize = new Size(36, 36)
  topRow.addSpacer(10)
  var infoCol = topRow.addStack(); infoCol.layoutVertically()
  var cityRow = infoCol.addStack(); cityRow.layoutHorizontally()
  var cn = cityRow.addText(city.name); cn.font = Font.semiboldSystemFont(15); cn.textColor = Color.white()
  cityRow.addSpacer(6)
  var dt = cityRow.addText(formatDateShort()); dt.font = Font.regularSystemFont(11); dt.textColor = new Color("ffffff", 0.6)
  infoCol.addSpacer(2)
  var tempRow = infoCol.addStack(); tempRow.layoutHorizontally(); tempRow.centerAlignContent()
  var tp = tempRow.addText(now.temp + "°"); tp.font = Font.boldRoundedSystemFont(32); tp.textColor = Color.white()
  tempRow.addSpacer(4)
  var ds = tempRow.addText(desc); ds.font = Font.regularSystemFont(14); ds.textColor = new Color("ffffff", 0.75)
  topRow.addSpacer()
  var detailCol = topRow.addStack(); detailCol.layoutVertically(); detailCol.topAlignContent()
  if (daily.length > 0) {
    var hl = detailCol.addText("↑" + daily[0].tempMax + "° ↓" + daily[0].tempMin + "°")
    hl.font = Font.mediumSystemFont(13); hl.textColor = new Color("ffffff", 0.8); hl.rightAlignText()
    detailCol.addSpacer(5)
  }
  addDetailRow(detailCol, "humidity.fill", now.humidity + "%"); detailCol.addSpacer(3)
  addDetailRow(detailCol, "wind", now.windScale + "级"); detailCol.addSpacer(3)
  addAQIRow(detailCol, air)
  addDivider(w, 0.15)
  var hourlyRow = w.addStack(); hourlyRow.layoutHorizontally()
  var hours = hourly.slice(0, 6)
  for (var i = 0; i < hours.length; i++) {
    if (i > 0) hourlyRow.addSpacer()
    var col = hourlyRow.addStack(); col.layoutVertically(); col.centerAlignContent(); col.size = new Size(44, 0)
    var timeLabel = col.addText(formatHourLabel(hours[i].fxTime))
    timeLabel.font = Font.regularSystemFont(10); timeLabel.textColor = new Color("ffffff", 0.6); timeLabel.centerAlignText()
    col.addSpacer(3)
    var hIcon = col.addImage(sfImage(getSFIcon(hours[i].icon), 18)); hIcon.imageSize = new Size(18, 18)
    col.addSpacer(3)
    var hTemp = col.addText(hours[i].temp + "°"); hTemp.font = Font.mediumSystemFont(13)
    hTemp.textColor = Color.white(); hTemp.centerAlignText()
  }
  return w
}

function buildLarge(data) {
  var city = data.city, now = data.now, daily = data.daily, hourly = data.hourly, air = data.air
  var icon = getSFIcon(now.icon), desc = getWeatherDesc(now.icon)
  var w = new ListWidget(); w.backgroundGradient = createBg(now.icon)
  w.setPadding(16, 18, 12, 18)
  w.url = "https://www.qweather.com/weather/" + city.id + ".html"
  var header = w.addStack(); header.layoutHorizontally(); header.centerAlignContent()
  var cn = header.addText(city.name); cn.font = Font.semiboldSystemFont(18); cn.textColor = Color.white()
  header.addSpacer(8)
  var dt = header.addText(formatDateFull()); dt.font = Font.regularSystemFont(12); dt.textColor = new Color("ffffff", 0.5)
  header.addSpacer()
  if (daily.length > 0) {
    var hl = header.addText("↑" + daily[0].tempMax + "° ↓" + daily[0].tempMin + "°")
    hl.font = Font.mediumSystemFont(14); hl.textColor = new Color("ffffff", 0.75)
  }
  w.addSpacer(8)
  var currentRow = w.addStack(); currentRow.layoutHorizontally(); currentRow.centerAlignContent()
  var iconView = currentRow.addImage(sfImage(icon, 48)); iconView.imageSize = new Size(48, 48)
  currentRow.addSpacer(12)
  var tempInfo = currentRow.addStack(); tempInfo.layoutVertically()
  var tp = tempInfo.addText(now.temp + "°"); tp.font = Font.boldRoundedSystemFont(50)
  tp.textColor = Color.white(); tp.lineLimit = 1; tp.minimumScaleFactor = 0.5
  var descRow = tempInfo.addStack(); descRow.layoutHorizontally(); descRow.centerAlignContent()
  var ds = descRow.addText(desc); ds.font = Font.regularSystemFont(14); ds.textColor = new Color("ffffff", 0.8)
  descRow.addSpacer(8)
  var feels = descRow.addText("体感" + now.feelsLike + "°"); feels.font = Font.regularSystemFont(10)
  feels.textColor = new Color("ffffff", 0.5)
  currentRow.addSpacer()
  var detailCol = currentRow.addStack(); detailCol.layoutVertically(); detailCol.topAlignContent()
  addDetailRow(detailCol, "humidity.fill", "湿度 " + now.humidity + "%"); detailCol.addSpacer(3)
  addDetailRow(detailCol, "wind", now.windDir + " " + now.windScale + "级"); detailCol.addSpacer(3)
  addDetailRow(detailCol, "eye.fill", "能见度 " + now.vis + "km"); detailCol.addSpacer(3)
  addAQIRow(detailCol, air)
  w.addSpacer(12); addSectionTitle(w, "24 小时预报"); w.addSpacer(6)
  var hourlyRow = w.addStack(); hourlyRow.layoutHorizontally()
  var hours = hourly.slice(0, 8); hourlyRow.addSpacer()
  for (var i = 0; i < hours.length; i++) {
    var hCol = hourlyRow.addStack(); hCol.layoutVertically(); hCol.centerAlignContent(); hCol.size = new Size(32, 0)
    var hTime = hCol.addText(formatHourLabel(hours[i].fxTime))
    hTime.font = Font.regularRoundedSystemFont(9); hTime.textColor = new Color("ffffff", 0.5); hTime.centerAlignText()
    hCol.addSpacer(2)
    var hIcon = hCol.addImage(sfImage(getSFIcon(hours[i].icon), 15)); hIcon.imageSize = new Size(15, 15)
    hCol.addSpacer(2)
    var hTemp = hCol.addText(hours[i].temp + "°"); hTemp.font = Font.mediumSystemFont(11)
    hTemp.textColor = Color.white(); hTemp.centerAlignText()
    hourlyRow.addSpacer()
  }
  addDivider(w, 0.12); addSectionTitle(w, "7 日天气预报"); w.addSpacer(6)
  var globalMin = Infinity, globalMax = -Infinity
  for (var j = 0; j < daily.length; j++) {
    var tMin = parseInt(daily[j].tempMin, 10), tMax = parseInt(daily[j].tempMax, 10)
    if (tMin < globalMin) globalMin = tMin; if (tMax > globalMax) globalMax = tMax
  }
  var days = daily.slice(0, 7), barW = 65
  for (var k = 0; k < days.length; k++) {
    var row = w.addStack(); row.layoutHorizontally(); row.centerAlignContent()
    var dayLabel = row.addText(formatDayShort(days[k].fxDate))
    dayLabel.font = k === 0 ? Font.semiboldSystemFont(12) : Font.regularSystemFont(12)
    dayLabel.textColor = k === 0 ? Color.white() : new Color("ffffff", 0.85); dayLabel.lineLimit = 1
    row.addSpacer(8)
    var dIcon = row.addImage(sfImage(getSFIcon(days[k].iconDay), 14)); dIcon.imageSize = new Size(14, 14)
    row.addSpacer(6)
    var dDesc = row.addText(getWeatherDesc(days[k].iconDay)); dDesc.font = Font.regularSystemFont(10)
    dDesc.textColor = new Color("ffffff", 0.5); row.addSpacer()
    var lo = row.addText(days[k].tempMin + "°"); lo.font = Font.regularSystemFont(12)
    lo.textColor = new Color("ffffff", 0.45); row.addSpacer(4)
    var bar = row.addImage(drawTempBar(parseInt(days[k].tempMin, 10), parseInt(days[k].tempMax, 10), globalMin, globalMax, barW))
    bar.imageSize = new Size(barW, 6); row.addSpacer(4)
    var hi = row.addText(days[k].tempMax + "°"); hi.font = Font.mediumSystemFont(12); hi.textColor = Color.white()
    if (k < days.length - 1) w.addSpacer(5)
  }
  return w
}

function buildLockCircular(data) {
  var now = data.now, air = data.air, icon = getSFIcon(now.icon)
  var w = new ListWidget()
  if (air) { var ring = drawAQIRing(air.aqi, 66); if (ring) { try { w.backgroundImage = ring } catch (e) {} } }
  w.addSpacer()
  var row1 = w.addStack(); row1.layoutHorizontally(); row1.addSpacer()
  var iconView = row1.addImage(sfImage(icon, 20)); iconView.imageSize = new Size(20, 20); row1.addSpacer()
  w.addSpacer(1)
  var row2 = w.addStack(); row2.layoutHorizontally(); row2.addSpacer()
  var tempLabel = row2.addText(now.temp + "°"); tempLabel.font = Font.boldRoundedSystemFont(18)
  tempLabel.textColor = Color.white(); row2.addSpacer()
  if (air) {
    w.addSpacer(1); var info = aqiInfo(air.aqi)
    var row3 = w.addStack(); row3.layoutHorizontally(); row3.centerAlignContent(); row3.addSpacer()
    var dot = row3.addImage(drawDot(info.color, 5)); dot.imageSize = new Size(5, 5); row3.addSpacer(2)
    var aqiLabel = row3.addText(info.category); aqiLabel.font = Font.regularSystemFont(8); aqiLabel.textColor = info.color
    row3.addSpacer()
  }
  w.addSpacer(); return w
}

function buildLockRect(data) {
  var city = data.city, now = data.now, daily = data.daily, air = data.air
  var icon = getSFIcon(now.icon)
  var w = new ListWidget()
  var row1 = w.addStack(); row1.layoutHorizontally(); row1.centerAlignContent()
  var cityLabel = row1.addText(city.name); cityLabel.font = Font.semiboldSystemFont(13); cityLabel.textColor = Color.white()
  if (air) {
    row1.addSpacer(6); var info = aqiInfo(air.aqi)
    var dot = row1.addImage(drawDot(info.color, 6)); dot.imageSize = new Size(6, 6); row1.addSpacer(2)
    var aqiLabel = row1.addText(info.category); aqiLabel.font = Font.regularSystemFont(11); aqiLabel.textColor = info.color
  }
  w.addSpacer(2)
  var row2 = w.addStack(); row2.layoutHorizontally(); row2.centerAlignContent()
  var iconView = row2.addImage(sfImage(icon, 16)); iconView.imageSize = new Size(16, 16); row2.addSpacer(3)
  var tempLabel = row2.addText(now.temp + "°"); tempLabel.font = Font.boldRoundedSystemFont(16); tempLabel.textColor = Color.white()
  row2.addSpacer(4)
  var descLabel = row2.addText(getWeatherDesc(now.icon)); descLabel.font = Font.regularSystemFont(11)
  descLabel.textColor = new Color("ffffff", 0.7); row2.addSpacer()
  if (daily.length > 0) {
    var hl = row2.addText("↑" + daily[0].tempMax + "° ↓" + daily[0].tempMin + "°")
    hl.font = Font.regularSystemFont(10); hl.textColor = new Color("ffffff", 0.5)
  }
  w.addSpacer(2)
  var row3 = w.addStack(); row3.layoutHorizontally()
  var hmLabel = row3.addText("湿度" + now.humidity + "%"); hmLabel.font = Font.regularSystemFont(10)
  hmLabel.textColor = new Color("ffffff", 0.5); row3.addSpacer(8)
  var windLabel = row3.addText(now.windDir + " " + now.windScale + "级"); windLabel.font = Font.regularSystemFont(10)
  windLabel.textColor = new Color("ffffff", 0.5)
  if (air && air.pm2p5) { row3.addSpacer(8); var pmLabel = row3.addText("PM2.5 " + air.pm2p5)
    pmLabel.font = Font.regularSystemFont(10); pmLabel.textColor = new Color("ffffff", 0.5) }
  return w
}

function buildLockInline(data) {
  var city = data.city, now = data.now, air = data.air
  var w = new ListWidget()
  var text = city.name + " " + now.temp + "° " + getWeatherDesc(now.icon)
  if (air) text += " " + aqiInfo(air.aqi).category
  var label = w.addText(text); label.font = Font.regularSystemFont(14); label.textColor = Color.white(); label.lineLimit = 1
  return w
}

function buildError(message, isLock) {
  var w = new ListWidget(); if (!isLock) w.backgroundGradient = createBg("100")
  w.setPadding(12, 16, 12, 16); w.addSpacer()
  var text = w.addText(message); text.font = Font.regularSystemFont(isLock ? 11 : 14)
  text.textColor = Color.white(); text.centerAlignText(); w.addSpacer(); return w
}

async function addCityFlow(apiKey) {
  var alert = new Alert(); alert.title = "添加城市"
  alert.addTextField("城市名称（如：北京）", ""); alert.addAction("搜索"); alert.addCancelAction("取消")
  var result = await alert.presentAlert(); if (result === -1) return null
  var name = alert.textFieldValue(0).trim(); if (!name) return null
  try { var city = await lookupCity(name, apiKey); if (city) return { name: city.name, id: city.id } } catch (e) {}
  var err = new Alert(); err.title = "未找到"; err.message = "无法找到「" + name + "」"
  err.addAction("确定"); await err.presentAlert(); return null
}

async function showSetup(existing) {
  while (true) {
    var alert = new Alert(); alert.title = "天气小组件设置"
    alert.message = "请输入和风天气 API Key"
    alert.addTextField("API Key", existing ? existing.apiKey : "")
    alert.addAction("下一步"); alert.addCancelAction("取消")
    var result = await alert.presentAlert(); if (result === -1) return null
    var apiKey = alert.textFieldValue(0).trim()
    if (!apiKey) { var e = new Alert(); e.title = "请输入 API Key"; e.addAction("确定"); await e.presentAlert(); continue }
    var city = await addCityFlow(apiKey); if (!city) continue
    var cfg = { apiKey: apiKey, cities: [city], active: 0 }; saveConfig(cfg); clearCache()
    var ok = new Alert(); ok.title = "设置成功"
    ok.message = "城市: " + city.name + "\\nAPI Key: " + apiKey.substring(0, 6) + "****"
    ok.addAction("确定"); await ok.presentAlert(); return cfg
  }
}

async function showCityMenu(cfg) {
  while (true) {
    var alert = new Alert(); alert.title = "城市管理"
    alert.message = "当前: " + cfg.cities[cfg.active].name + "  (" + (cfg.active + 1) + "/" + cfg.cities.length + ")"
    for (var i = 0; i < cfg.cities.length; i++) alert.addAction((i === cfg.active ? "● " : "   ") + cfg.cities[i].name)
    alert.addAction("＋ 添加城市"); alert.addCancelAction("返回")
    var choice = await alert.presentAlert(); if (choice === -1) return cfg
    if (choice < cfg.cities.length) { cfg.active = choice; saveConfig(cfg)
      var sw = new Alert(); sw.title = "已切换"; sw.message = "当前城市: " + cfg.cities[cfg.active].name
      sw.addAction("确定"); await sw.presentAlert(); continue }
    var newCity = await addCityFlow(cfg.apiKey)
    if (newCity) {
      var dup = false
      for (var j = 0; j < cfg.cities.length; j++) { if (cfg.cities[j].id === newCity.id) { dup = true; break } }
      if (dup) { var d = new Alert(); d.title = "已存在"; d.message = newCity.name + " 已在列表中"; d.addAction("确定"); await d.presentAlert() }
      else { cfg.cities.push(newCity); cfg.active = cfg.cities.length - 1; saveConfig(cfg) }
    }
  }
}

async function showMainMenu(cfg) {
  while (true) {
    var city = cfg.cities[cfg.active]
    var alert = new Alert(); alert.title = "天气小组件"
    alert.message = "城市: " + city.name + "  API: " + cfg.apiKey.substring(0, 6) + "****  共" + cfg.cities.length + "城"
    alert.addAction("小组件预览"); alert.addAction("中组件预览"); alert.addAction("大组件预览")
    alert.addAction("锁屏 · 圆形"); alert.addAction("锁屏 · 矩形"); alert.addAction("锁屏 · 文字")
    alert.addAction("城市管理"); alert.addAction("修改 API Key"); alert.addAction("清除缓存")
    alert.addCancelAction("退出")
    var choice = await alert.presentAlert()
    if (choice === -1) { Script.complete(); return }
    if (choice === 7) { var nc = await showSetup(cfg); if (nc) cfg = nc; continue }
    if (choice === 8) { clearCache(); var ok = new Alert(); ok.title = "已清除"; ok.message = "天气缓存已清除"; ok.addAction("确定"); await ok.presentAlert(); continue }
    if (choice === 6) { cfg = await showCityMenu(cfg); continue }
    var data; try { data = await fetchAll(cfg) } catch (err) {
      var ea = new Alert(); ea.title = "获取失败"; ea.message = err.message || "未知错误"; ea.addAction("确定"); await ea.presentAlert(); continue }
    var builders = [buildSmall, buildMedium, buildLarge, buildLockCircular, buildLockRect, buildLockInline]
    var presenters = [
      function(w) { return w.presentSmall() }, function(w) { return w.presentMedium() },
      function(w) { return w.presentLarge() },
      function(w) { return typeof w.presentAccessoryCircular === "function" ? w.presentAccessoryCircular() : w.presentSmall() },
      function(w) { return typeof w.presentAccessoryRectangular === "function" ? w.presentAccessoryRectangular() : w.presentMedium() },
      function(w) { return typeof w.presentAccessoryInline === "function" ? w.presentAccessoryInline() : w.presentSmall() }
    ]
    var widget = builders[choice](data); await presenters[choice](widget)
  }
}

async function main() {
  var cfg = loadConfig()
  if (!cfg) {
    if (config.widgetFamily) {
      var isLock = (config.widgetFamily || "").indexOf("accessory") === 0
      Script.setWidget(buildError("请先在 App 中运行脚本完成设置", isLock)); Script.complete(); return
    }
    cfg = await showSetup(null); if (!cfg) { Script.complete(); return }
  }
  var family = config.widgetFamily
  if (family) {
    var data; try { data = await fetchAll(cfg) } catch (err) {
      Script.setWidget(buildError("⚠ " + (err.message || "获取失败"), family.indexOf("accessory") === 0))
      Script.complete(); return }
    var widgetMap = { small: buildSmall, medium: buildMedium, large: buildLarge,
      accessoryCircular: buildLockCircular, accessoryRectangular: buildLockRect, accessoryInline: buildLockInline }
    var builder = widgetMap[family]
    if (builder) Script.setWidget(builder(data)); else Script.setWidget(buildError("不支持的尺寸: " + family, false))
    Script.complete(); return
  }
  await showMainMenu(cfg); Script.complete()
}

await main()
`


// ==========================================
//  电量小组件源码
// ==========================================
var BATTERY_WIDGET_CODE = `
"use strict"

var fm = FileManager.local()

function batteryLevel() {
  return Math.round(Device.batteryLevel() * 100)
}

function isCharging() {
  return Device.isCharging()
}

function batteryColor(level) {
  if (level > 60) return new Color("#4ade80")
  if (level > 20) return new Color("#fbbf24")
  return new Color("#ef4444")
}

function drawBatteryRing(level, size) {
  var ctx = new DrawContext()
  ctx.size = new Size(size, size)
  ctx.opaque = false
  var cx = size / 2, cy = size / 2, r = size / 2 - 6, lw = 6

  ctx.setStrokeColor(new Color("ffffff", 0.12))
  ctx.setLineWidth(lw)
  var bg = new Path()
  bg.addArc(new Point(cx, cy), r, 0, 360)
  ctx.addPath(bg)
  ctx.strokePath()

  ctx.setStrokeColor(batteryColor(level))
  ctx.setLineWidth(lw)
  var fg = new Path()
  fg.addArc(new Point(cx, cy), r, 270, 270 + (level / 100) * 360)
  ctx.addPath(fg)
  ctx.strokePath()

  return ctx.getImage()
}

function buildBatterySmall() {
  var level = batteryLevel()
  var charging = isCharging()

  var w = new ListWidget()
  w.backgroundGradient = new LinearGradient()
  w.backgroundGradient.colors = [new Color("#0f172a"), new Color("#1e293b")]
  w.backgroundGradient.locations = [0, 1]
  w.setPadding(16, 16, 16, 16)

  w.addSpacer()

  var centerRow = w.addStack()
  centerRow.layoutHorizontally()
  centerRow.addSpacer()

  var iconCol = centerRow.addStack()
  iconCol.layoutVertically()
  iconCol.centerAlignContent()

  var ringImg = iconCol.addImage(drawBatteryRing(level, 60))
  ringImg.imageSize = new Size(60, 60)

  iconCol.addSpacer(4)

  var pctRow = iconCol.addStack()
  pctRow.layoutHorizontally()
  pctRow.addSpacer()
  var pctLabel = pctRow.addText(level + "%")
  pctLabel.font = Font.boldRoundedSystemFont(22)
  pctLabel.textColor = batteryColor(level)
  pctRow.addSpacer()

  centerRow.addSpacer()

  w.addSpacer(6)

  if (charging) {
    var chargeRow = w.addStack()
    chargeRow.layoutHorizontally()
    chargeRow.addSpacer()
    var sym = SFSymbol.named("bolt.fill")
    sym.applyFont(Font.regularSystemFont(10))
    var boltImg = chargeRow.addImage(sym.image)
    boltImg.imageSize = new Size(10, 10)
    chargeRow.addSpacer(2)
    var chargeLabel = chargeRow.addText("充电中")
    chargeLabel.font = Font.regularSystemFont(10)
    chargeLabel.textColor = new Color("#4ade80")
    chargeRow.addSpacer()
  }

  return w
}

function buildBatteryMedium() {
  var level = batteryLevel()
  var charging = isCharging()

  var w = new ListWidget()
  w.backgroundGradient = new LinearGradient()
  w.backgroundGradient.colors = [new Color("#0f172a"), new Color("#1e293b")]
  w.backgroundGradient.locations = [0, 1]
  w.setPadding(16, 20, 16, 20)

  var header = w.addStack()
  header.layoutHorizontally()
  header.centerAlignContent()

  var titleSym = SFSymbol.named("battery.100.bolt")
  titleSym.applyFont(Font.boldSystemFont(16))
  var titleIcon = header.addImage(titleSym.image)
  titleIcon.imageSize = new Size(16, 16)
  header.addSpacer(6)
  var titleLabel = header.addText("电池")
  titleLabel.font = Font.semiboldSystemFont(16)
  titleLabel.textColor = Color.white()

  header.addSpacer()

  var deviceLabel = header.addText(Device.model())
  deviceLabel.font = Font.regularSystemFont(11)
  deviceLabel.textColor = new Color("ffffff", 0.5)

  w.addSpacer(10)

  var mainRow = w.addStack()
  mainRow.layoutHorizontally()
  mainRow.centerAlignContent()

  var ringCol = mainRow.addStack()
  ringCol.layoutVertically()
  ringCol.centerAlignContent()
  var ringImg = ringCol.addImage(drawBatteryRing(level, 80))
  ringImg.imageSize = new Size(80, 80)
  ringCol.addSpacer(4)
  var pctLabel = ringCol.addText(level + "%")
  pctLabel.font = Font.boldRoundedSystemFont(28)
  pctLabel.textColor = batteryColor(level)

  mainRow.addSpacer(20)

  var infoCol = mainRow.addStack()
  infoCol.layoutVertically()

  var statusRow = infoCol.addStack()
  statusRow.layoutHorizontally()
  statusRow.centerAlignContent()
  var boltSym = SFSymbol.named(charging ? "bolt.fill" : "bolt.slash.fill")
  boltSym.applyFont(Font.regularSystemFont(12))
  var boltImg = statusRow.addImage(boltSym.image)
  boltImg.imageSize = new Size(12, 12)
  statusRow.addSpacer(4)
  var statusLabel = statusRow.addText(charging ? "充电中" : "未充电")
  statusLabel.font = Font.regularSystemFont(13)
  statusLabel.textColor = charging ? new Color("#4ade80") : new Color("ffffff", 0.6)

  infoCol.addSpacer(8)

  var modelRow = infoCol.addStack()
  modelRow.layoutHorizontally()
  var sym2 = SFSymbol.named("iphone")
  sym2.applyFont(Font.regularSystemFont(12))
  var img2 = modelRow.addImage(sym2.image)
  img2.imageSize = new Size(12, 12)
  modelRow.addSpacer(4)
  var modelLabel = modelRow.addText(Device.model())
  modelLabel.font = Font.regularSystemFont(12)
  modelLabel.textColor = new Color("ffffff", 0.5)

  infoCol.addSpacer(6)

  var nameRow = infoCol.addStack()
  nameRow.layoutHorizontally()
  var sym3 = SFSymbol.named("person.fill")
  sym3.applyFont(Font.regularSystemFont(12))
  var img3 = nameRow.addImage(sym3.image)
  img3.imageSize = new Size(12, 12)
  nameRow.addSpacer(4)
  var nameLabel = nameRow.addText(Device.name())
  nameLabel.font = Font.regularSystemFont(12)
  nameLabel.textColor = new Color("ffffff", 0.5)
  nameLabel.lineLimit = 1

  return w
}

async function main() {
  var family = config.widgetFamily
  if (family === "medium") {
    Script.setWidget(buildBatteryMedium())
  } else {
    Script.setWidget(buildBatterySmall())
  }
  Script.complete()
}

await main()
`


// ==========================================
//  倒数日小组件源码
// ==========================================
var COUNTDOWN_WIDGET_CODE = `
"use strict"

var fm = FileManager.local()
var cfgPath = fm.joinPath(fm.documentsDirectory(), "countdown_events.json")

function loadEvents() {
  try {
    if (fm.fileExists(cfgPath)) return JSON.parse(fm.readString(cfgPath))
  } catch (e) {}
  return [
    { name: "元旦", date: "2026-01-01", emoji: "🎉" },
    { name: "春节", date: "2026-02-17", emoji: "🧧" },
    { name: "中秋", date: "2026-10-04", emoji: "🥮" }
  ]
}

function saveEvents(events) {
  try { fm.writeString(cfgPath, JSON.stringify(events)) } catch (e) {}
}

function daysUntil(dateStr) {
  var target = new Date(dateStr + "T00:00:00")
  var today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - today.getTime()) / 86400000)
}

function buildCountdownSmall() {
  var events = loadEvents()
  events.sort(function(a, b) { return daysUntil(a.date) - daysUntil(b.date) })

  var w = new ListWidget()
  w.backgroundGradient = new LinearGradient()
  w.backgroundGradient.colors = [new Color("#1a0533"), new Color("#0d2b1a")]
  w.backgroundGradient.locations = [0, 1]
  w.setPadding(12, 16, 12, 16)

  var header = w.addStack()
  header.layoutHorizontally()
  var sym = SFSymbol.named("calendar")
  sym.applyFont(Font.boldSystemFont(14))
  var icon = header.addImage(sym.image)
  icon.imageSize = new Size(14, 14)
  header.addSpacer(4)
  var title = header.addText("倒数日")
  title.font = Font.semiboldSystemFont(14)
  title.textColor = Color.white()

  w.addSpacer()

  var top = events.slice(0, 2)
  for (var i = 0; i < top.length; i++) {
    var days = daysUntil(top[i].date)
    var row = w.addStack()
    row.layoutHorizontally()
    row.centerAlignContent()

    var emoji = row.addText(top[i].emoji || "📌")
    emoji.font = Font.regularSystemFont(14)
    row.addSpacer(4)

    var name = row.addText(top[i].name)
    name.font = Font.mediumSystemFont(13)
    name.textColor = Color.white()
    name.lineLimit = 1

    row.addSpacer()

    var daysText = days > 0 ? days + "天" : days === 0 ? "今天" : Math.abs(days) + "天前"
    var daysLabel = row.addText(daysText)
    daysLabel.font = Font.boldRoundedSystemFont(14)
    daysLabel.textColor = days >= 0 ? new Color("#c084fc") : new Color("#fb923c")

    if (i < top.length - 1) w.addSpacer(8)
  }

  return w
}

async function showEditor() {
  var events = loadEvents()
  while (true) {
    var alert = new Alert()
    alert.title = "管理事件"
    alert.message = "共 " + events.length + " 个事件"
    for (var i = 0; i < events.length; i++) {
      var d = daysUntil(events[i].date)
      alert.addAction((events[i].emoji || "") + " " + events[i].name + "  (" + d + "天)")
    }
    alert.addAction("＋ 添加事件")
    alert.addCancelAction("退出")

    var choice = await alert.presentAlert()
    if (choice === -1) { Script.complete(); return }

    if (choice === events.length) {
      var addAlert = new Alert()
      addAlert.title = "添加事件"
      addAlert.addTextField("事件名称", "")
      addAlert.addTextField("日期 (YYYY-MM-DD)", "")
      addAlert.addTextField("Emoji (可选)", "📌")
      addAlert.addAction("添加")
      addAlert.addCancelAction("取消")
      var addResult = await addAlert.presentAlert()
      if (addResult === 0) {
        var name = addAlert.textFieldValue(0).trim()
        var date = addAlert.textFieldValue(1).trim()
        var emoji = addAlert.textFieldValue(2).trim() || "📌"
        if (name && date) {
          events.push({ name: name, date: date, emoji: emoji })
          saveEvents(events)
        }
      }
      continue
    }

    // 删除事件
    if (choice < events.length) {
      var delAlert = new Alert()
      delAlert.title = "删除「" + events[choice].name + "」？"
      delAlert.addDestructiveAction("删除")
      delAlert.addCancelAction("取消")
      var delResult = await delAlert.presentAlert()
      if (delResult === 0) {
        events.splice(choice, 1)
        saveEvents(events)
      }
    }
  }
}

async function main() {
  var family = config.widgetFamily
  if (family) {
    Script.setWidget(buildCountdownSmall())
    Script.complete()
    return
  }
  await showEditor()
}

await main()
`

// ============================================================
//  安装器定义结束
// ============================================================
