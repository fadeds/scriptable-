// ==========================================
//  天气小组件 · Scriptable (iOS 16+)
//  SF Symbols · 空气质量 · 多城市 · 锁屏
//  数据源: 和风天气 QWeather API
// ==========================================
"use strict"

var API_HOST  = "mx4nmt4abk.re.qweatherapi.com"
var CACHE_TTL = 30 * 60 * 1000

var fm         = FileManager.local()
var configPath = fm.joinPath(fm.documentsDirectory(), "qw_config.json")
var cachePath  = fm.joinPath(fm.cacheDirectory(), "qw_cache.json")

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
  var night = isNight(), c = parseInt(code, 10), g = new LinearGradient()
  if (c === 100 || (c >= 150 && c <= 153))
    g.colors = night ? [new Color("#0B1026"), new Color("#1B2559")]
                     : [new Color("#1565C0"), new Color("#64B5F6")]
  else if ([101, 102, 103].includes(c))
    g.colors = night ? [new Color("#121828"), new Color("#2C3A5C")]
                     : [new Color("#546E7A"), new Color("#90A4AE")]
  else if (c === 104)
    g.colors = night ? [new Color("#1A1A2E"), new Color("#3D3D5C")]
                     : [new Color("#607D8B"), new Color("#90A4AE")]
  else if (c >= 300 && c < 400)
    g.colors = night ? [new Color("#0D1117"), new Color("#21262D")]
                     : [new Color("#263238"), new Color("#546E7A")]
  else if (c >= 400 && c < 500)
    g.colors = night ? [new Color("#1B2838"), new Color("#3D5166")]
                     : [new Color("#607D8B"), new Color("#B0BEC5")]
  else if (c >= 500)
    g.colors = night ? [new Color("#2D2D2D"), new Color("#4D4D4D")]
                     : [new Color("#757575"), new Color("#BDBDBD")]
  else
    g.colors = night ? [new Color("#0F0C29"), new Color("#302B63")]
                     : [new Color("#2C3E50"), new Color("#5DADE2")]
  g.locations = [0, 1]; g.startPoint = new Point(0, 0); g.endPoint = new Point(1, 1)
  return g
}

function drawTempBar(minTemp, maxTemp, globalMin, globalMax, barWidth) {
  var ctx = new DrawContext()
  ctx.size = new Size(barWidth, 6)
  ctx.opaque = false
  var track = new Path()
  track.addRoundedRect(new Rect(0, 0, barWidth, 6), 3, 3)
  ctx.addPath(track)
  ctx.setFillColor(new Color("ffffff", 0.12))
  ctx.fillPath()
  var range = globalMax - globalMin || 1
  var startX = ((minTemp - globalMin) / range) * barWidth
  var barLen = Math.max(((maxTemp - globalMin) / range) * barWidth - startX, 8)
  var bar = new Path()
  bar.addRoundedRect(new Rect(startX, 0, barLen, 6), 3, 3)
  ctx.addPath(bar)
  ctx.setFillColor(new Color("ffffff", 0.55))
  ctx.fillPath()
  return ctx.getImage()
}

function drawAQIRing(value, size) {
  try {
    var ctx = new DrawContext()
    ctx.size = new Size(size, size); ctx.opaque = false
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
  var ctx = new DrawContext()
  ctx.size = new Size(size, size); ctx.opaque = false
  var p = new Path(); p.addEllipse(new Rect(0, 0, size, size))
  ctx.addPath(p); ctx.setFillColor(color); ctx.fillPath()
  return ctx.getImage()
}

function addDetailRow(stack, iconName, text) {
  var row = stack.addStack()
  row.layoutHorizontally(); row.centerAlignContent()
  var img = sfImageLight(iconName, 10)
  if (img) { var iv = row.addImage(img); iv.imageSize = new Size(10, 10); row.addSpacer(3) }
  var label = row.addText(text)
  label.font = Font.regularSystemFont(11)
  label.textColor = new Color("ffffff", 0.6)
}

function addAQIRow(stack, air) {
  if (!air) return
  var info = aqiInfo(air.aqi)
  var row = stack.addStack()
  row.layoutHorizontally(); row.centerAlignContent()
  var dot = row.addImage(drawDot(info.color, 6)); dot.imageSize = new Size(6, 6)
  row.addSpacer(3)
  var label = row.addText("AQI " + air.aqi + " " + info.category)
  label.font = Font.regularSystemFont(11)
  label.textColor = new Color("ffffff", 0.6)
}

function addSectionTitle(stack, text) {
  var row = stack.addStack()
  var label = row.addText(text)
  label.font = Font.mediumSystemFont(11)
  label.textColor = new Color("ffffff", 0.35)
}

function addDivider(stack, opacity) {
  stack.addSpacer(10)
  var bar = stack.addStack()
  bar.backgroundColor = new Color("ffffff", opacity || 0.12)
  bar.size = new Size(0, 0.5)
  stack.addSpacer(10)
}

// —————————————— 配置 / 缓存 / API ——————————————

function loadConfig() {
  try {
    if (!fm.fileExists(configPath)) return null
    var c = JSON.parse(fm.readString(configPath))
    if (c && c.apiKey && c.cityName && !c.cities) {
      var m = { apiKey: c.apiKey, cities: [{ name: c.cityName, id: c.cityId || "" }], active: 0 }
      saveConfig(m); return m
    }
    if (c && c.apiKey && Array.isArray(c.cities) && c.cities.length > 0) {
      if (typeof c.active !== "number" || c.active >= c.cities.length) c.active = 0
      return c
    }
  } catch (e) { /* ignore */ }
  return null
}

function saveConfig(cfg) {
  try { fm.writeString(configPath, JSON.stringify(cfg)) } catch (e) { /* ignore */ }
}

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
  try {
    fm.writeString(cachePath, JSON.stringify({ apiKey: apiKey, cityId: cityId, ts: Date.now(), data: data }))
  } catch (e) { /* ignore */ }
}

function clearCache() {
  try { if (fm.fileExists(cachePath)) fm.remove(cachePath) } catch (e) { /* ignore */ }
}

async function apiRequest(path, apiKey) {
  var sep = path.includes("?") ? "&" : "?"
  var req = new Request("https://" + API_HOST + path + sep + "key=" + apiKey)
  req.timeoutInterval = 15
  return await req.loadJSON()
}

async function lookupCity(name, apiKey) {
  var d = await apiRequest("/geo/v2/city/lookup?location=" + encodeURIComponent(name), apiKey)
  return d.code === "200" && Array.isArray(d.location) && d.location.length > 0 ? d.location[0] : null
}

async function fetchNow(id, k) { var d = await apiRequest("/v7/weather/now?location=" + id, k); return d.code === "200" ? d.now : null }
async function fetchDaily(id, k) { var d = await apiRequest("/v7/weather/7d?location=" + id, k); return d.code === "200" && Array.isArray(d.daily) ? d.daily : [] }
async function fetchHourly(id, k) { var d = await apiRequest("/v7/weather/24h?location=" + id, k); return d.code === "200" && Array.isArray(d.hourly) ? d.hourly : [] }
async function fetchAir(id, k) { try { var d = await apiRequest("/v7/air/now?location=" + id, k); return d.code === "200" && d.now ? d.now : null } catch (e) { return null } }

async function fetchAll(cfg) {
  var entry = cfg.cities[cfg.active], cityId = entry.id
  if (cityId) { var ch = loadCache(cfg.apiKey, cityId); if (ch) return ch }
  var cityInfo = await lookupCity(entry.name, cfg.apiKey)
  if (!cityInfo) throw new Error("无法找到城市「" + entry.name + "」")
  if (cityInfo.id !== cityId) {
    cfg.cities[cfg.active].id = cityInfo.id; cfg.cities[cfg.active].name = cityInfo.name
    saveConfig(cfg); cityId = cityInfo.id
  }
  var ch2 = loadCache(cfg.apiKey, cityId); if (ch2) return ch2
  var r = await Promise.all([fetchNow(cityId, cfg.apiKey), fetchDaily(cityId, cfg.apiKey), fetchHourly(cityId, cfg.apiKey), fetchAir(cityId, cfg.apiKey)])
  if (!r[0]) throw new Error("无法获取天气数据")
  var payload = { city: cityInfo, now: r[0], daily: r[1], hourly: r[2], air: r[3] }
  saveCache(cfg.apiKey, cityId, payload)
  return payload
}

// =============================================
//  锁屏小组件
// =============================================
function buildLockCircular(data) {
  var now = data.now, air = data.air, icon = getSFIcon(now.icon)
  var w = new ListWidget()
  if (air) { var ring = drawAQIRing(air.aqi, 66); if (ring) try { w.backgroundImage = ring } catch (e) {} }
  w.addSpacer()
  var r1 = w.addStack(); r1.layoutHorizontally(); r1.addSpacer()
  var iv = r1.addImage(sfImage(icon, 20)); iv.imageSize = new Size(20, 20); r1.addSpacer()
  w.addSpacer(1)
  var r2 = w.addStack(); r2.layoutHorizontally(); r2.addSpacer()
  var tp = r2.addText(now.temp + "°"); tp.font = Font.boldRoundedSystemFont(18); tp.textColor = Color.white()
  r2.addSpacer()
  if (air) {
    w.addSpacer(1); var info = aqiInfo(air.aqi)
    var r3 = w.addStack(); r3.layoutHorizontally(); r3.centerAlignContent(); r3.addSpacer()
    var dot = r3.addImage(drawDot(info.color, 5)); dot.imageSize = new Size(5, 5); r3.addSpacer(2)
    var al = r3.addText(info.category); al.font = Font.regularSystemFont(8); al.textColor = info.color
    r3.addSpacer()
  }
  w.addSpacer(); return w
}

function buildLockRect(data) {
  var city = data.city, now = data.now, daily = data.daily, air = data.air
  var icon = getSFIcon(now.icon), w = new ListWidget()
  var r1 = w.addStack(); r1.layoutHorizontally(); r1.centerAlignContent()
  var cn = r1.addText(city.name); cn.font = Font.semiboldSystemFont(13); cn.textColor = Color.white()
  if (air) {
    r1.addSpacer(6); var info = aqiInfo(air.aqi)
    var dot = r1.addImage(drawDot(info.color, 6)); dot.imageSize = new Size(6, 6); r1.addSpacer(2)
    var al = r1.addText(info.category); al.font = Font.regularSystemFont(11); al.textColor = info.color
  }
  w.addSpacer(2)
  var r2 = w.addStack(); r2.layoutHorizontally(); r2.centerAlignContent()
  var iv = r2.addImage(sfImage(icon, 16)); iv.imageSize = new Size(16, 16); r2.addSpacer(3)
  var tp = r2.addText(now.temp + "°"); tp.font = Font.boldRoundedSystemFont(16); tp.textColor = Color.white()
  r2.addSpacer(4)
  var ds = r2.addText(getWeatherDesc(now.icon)); ds.font = Font.regularSystemFont(11); ds.textColor = new Color("ffffff", 0.7)
  r2.addSpacer()
  if (daily.length > 0) { var hl = r2.addText("↑" + daily[0].tempMax + "° ↓" + daily[0].tempMin + "°"); hl.font = Font.regularSystemFont(10); hl.textColor = new Color("ffffff", 0.5) }
  w.addSpacer(2)
  var r3 = w.addStack(); r3.layoutHorizontally()
  var hm = r3.addText("湿度" + now.humidity + "%"); hm.font = Font.regularSystemFont(10); hm.textColor = new Color("ffffff", 0.5)
  r3.addSpacer(8)
  var wd = r3.addText(now.windDir + " " + now.windScale + "级"); wd.font = Font.regularSystemFont(10); wd.textColor = new Color("ffffff", 0.5)
  if (air && air.pm2p5) { r3.addSpacer(8); var pm = r3.addText("PM2.5 " + air.pm2p5); pm.font = Font.regularSystemFont(10); pm.textColor = new Color("ffffff", 0.5) }
  return w
}

function buildLockInline(data) {
  var city = data.city, now = data.now, air = data.air, w = new ListWidget()
  var t = city.name + " " + now.temp + "° " + getWeatherDesc(now.icon)
  if (air) t += " " + aqiInfo(air.aqi).category
  var lb = w.addText(t); lb.font = Font.regularSystemFont(14); lb.textColor = Color.white(); lb.lineLimit = 1
  return w
}

// =============================================
//  主屏幕 · 小组件
// =============================================
function buildSmall(data) {
  var city = data.city, now = data.now, daily = data.daily
  var icon = getSFIcon(now.icon), desc = getWeatherDesc(now.icon)
  var w = new ListWidget()
  w.backgroundGradient = createBg(now.icon); w.setPadding(12, 16, 12, 16)
  w.url = "https://www.qweather.com/weather/" + city.id + ".html"

  var hd = w.addStack(); hd.layoutHorizontally()
  var cn = hd.addText(city.name); cn.font = Font.mediumSystemFont(14); cn.textColor = Color.white()
  hd.addSpacer()
  var dt = hd.addText(formatDateShort()); dt.font = Font.regularSystemFont(11); dt.textColor = new Color("ffffff", 0.6)

  w.addSpacer()
  var mr = w.addStack(); mr.layoutHorizontally(); mr.centerAlignContent()
  var iv = mr.addImage(sfImage(icon, 44)); iv.imageSize = new Size(44, 44); mr.addSpacer(8)
  var tc = mr.addStack(); tc.layoutVertically()
  var tp = tc.addText(now.temp + "°"); tp.font = Font.boldRoundedSystemFont(48); tp.textColor = Color.white()
  tp.lineLimit = 1; tp.minimumScaleFactor = 0.5
  var ds = tc.addText(desc); ds.font = Font.regularSystemFont(14); ds.textColor = new Color("ffffff", 0.8)

  w.addSpacer()
  var ft = w.addStack(); ft.layoutHorizontally()
  if (daily.length > 0) { var hl = ft.addText("↑" + daily[0].tempMax + "° ↓" + daily[0].tempMin + "°"); hl.font = Font.regularSystemFont(12); hl.textColor = new Color("ffffff", 0.75) }
  ft.addSpacer()
  var wd = ft.addText(now.windDir + " " + now.windScale + "级"); wd.font = Font.regularSystemFont(10); wd.textColor = new Color("ffffff", 0.55)
  return w
}

// =============================================
//  主屏幕 · 中组件
// =============================================
function buildMedium(data) {
  var city = data.city, now = data.now, daily = data.daily
  var hourly = data.hourly, air = data.air
  var icon = getSFIcon(now.icon), desc = getWeatherDesc(now.icon)
  var w = new ListWidget()
  w.backgroundGradient = createBg(now.icon); w.setPadding(14, 18, 14, 18)
  w.url = "https://www.qweather.com/weather/" + city.id + ".html"

  var top = w.addStack(); top.layoutHorizontally(); top.centerAlignContent()
  var iv = top.addImage(sfImage(icon, 36)); iv.imageSize = new Size(36, 36); top.addSpacer(10)
  var info = top.addStack(); info.layoutVertically()
  var cr = info.addStack(); cr.layoutHorizontally()
  var cn = cr.addText(city.name); cn.font = Font.semiboldSystemFont(15); cn.textColor = Color.white()
  cr.addSpacer(6)
  var dt = cr.addText(formatDateShort()); dt.font = Font.regularSystemFont(11); dt.textColor = new Color("ffffff", 0.6)
  info.addSpacer(2)
  var tr = info.addStack(); tr.layoutHorizontally(); tr.centerAlignContent()
  var tp = tr.addText(now.temp + "°"); tp.font = Font.boldRoundedSystemFont(32); tp.textColor = Color.white()
  tr.addSpacer(4)
  var ds = tr.addText(desc); ds.font = Font.regularSystemFont(14); ds.textColor = new Color("ffffff", 0.75)

  top.addSpacer()
  var dc = top.addStack(); dc.layoutVertically(); dc.topAlignContent()
  if (daily.length > 0) { var hl = dc.addText("↑" + daily[0].tempMax + "° ↓" + daily[0].tempMin + "°"); hl.font = Font.mediumSystemFont(13); hl.textColor = new Color("ffffff", 0.8); hl.rightAlignText(); dc.addSpacer(5) }
  addDetailRow(dc, "humidity.fill", now.humidity + "%"); dc.addSpacer(3)
  addDetailRow(dc, "wind", now.windScale + "级"); dc.addSpacer(3)
  addAQIRow(dc, air)

  addDivider(w, 0.15)

  var hr = w.addStack(); hr.layoutHorizontally()
  var hours = hourly.slice(0, 6)
  for (var i = 0; i < hours.length; i++) {
    if (i > 0) hr.addSpacer()
    var col = hr.addStack(); col.layoutVertically(); col.centerAlignContent(); col.size = new Size(44, 0)
    var tm = col.addText(formatHourLabel(hours[i].fxTime)); tm.font = Font.regularSystemFont(10); tm.textColor = new Color("ffffff", 0.6); tm.centerAlignText()
    col.addSpacer(3)
    var hi = col.addImage(sfImage(getSFIcon(hours[i].icon), 18)); hi.imageSize = new Size(18, 18)
    col.addSpacer(3)
    var ht = col.addText(hours[i].temp + "°"); ht.font = Font.mediumSystemFont(13); ht.textColor = Color.white(); ht.centerAlignText()
  }
  return w
}

// =============================================
//  主屏幕 · 大组件 ★ 修复布局
// =============================================
function buildLarge(data) {
  var city = data.city, now = data.now, daily = data.daily
  var hourly = data.hourly, air = data.air
  var icon = getSFIcon(now.icon), desc = getWeatherDesc(now.icon)

  var w = new ListWidget()
  w.backgroundGradient = createBg(now.icon)
  // ★ 左右边距从 18 减到 14，给内容更多横向空间
  w.setPadding(16, 14, 12, 14)
  w.url = "https://www.qweather.com/weather/" + city.id + ".html"

  // ========== 头部 ==========
  var header = w.addStack()
  header.layoutHorizontally(); header.centerAlignContent()
  var cn = header.addText(city.name); cn.font = Font.semiboldSystemFont(18); cn.textColor = Color.white()
  header.addSpacer(8)
  var dt = header.addText(formatDateFull()); dt.font = Font.regularSystemFont(12); dt.textColor = new Color("ffffff", 0.5)
  header.addSpacer()
  if (daily.length > 0) {
    var hl = header.addText("↑" + daily[0].tempMax + "° ↓" + daily[0].tempMin + "°")
    hl.font = Font.mediumSystemFont(14); hl.textColor = new Color("ffffff", 0.75)
  }

  // ========== 当前天气 ==========
  w.addSpacer(8)
  var currentRow = w.addStack()
  currentRow.layoutHorizontally(); currentRow.centerAlignContent()
  var iconView = currentRow.addImage(sfImage(icon, 48)); iconView.imageSize = new Size(48, 48)
  currentRow.addSpacer(12)
  var tempInfo = currentRow.addStack(); tempInfo.layoutVertically()
  var tp = tempInfo.addText(now.temp + "°"); tp.font = Font.boldRoundedSystemFont(50); tp.textColor = Color.white()
  tp.lineLimit = 1; tp.minimumScaleFactor = 0.5
  var descRow = tempInfo.addStack(); descRow.layoutHorizontally(); descRow.centerAlignContent()
  var ds = descRow.addText(desc); ds.font = Font.regularSystemFont(14); ds.textColor = new Color("ffffff", 0.8)
  descRow.addSpacer(8)
  var feels = descRow.addText("体感" + now.feelsLike + "°"); feels.font = Font.regularSystemFont(10); feels.textColor = new Color("ffffff", 0.5)
  currentRow.addSpacer(20)
  var detailCol = currentRow.addStack(); detailCol.layoutVertically(); detailCol.topAlignContent()
  addDetailRow(detailCol, "humidity.fill", "湿度 " + now.humidity + "%"); detailCol.addSpacer(3)
  addDetailRow(detailCol, "wind", now.windDir + " " + now.windScale + "级"); detailCol.addSpacer(3)
  addDetailRow(detailCol, "eye.fill", "能见度 " + now.vis + "km"); detailCol.addSpacer(3)
  addAQIRow(detailCol, air)

  // ========== 逐小时预报 ★ 列宽 32→40，10列均匀撑满 ==========
  w.addSpacer(12)
  addSectionTitle(w, "24 小时预报")
  w.addSpacer(6)

  var hourlyRow = w.addStack()
  hourlyRow.layoutHorizontally()
  var hours = hourly.slice(0, 10)
  var COL_W = 40

  for (var i = 0; i < hours.length; i++) {
    if (i > 0) hourlyRow.addSpacer()
    var hCol = hourlyRow.addStack()
    hCol.layoutVertically(); hCol.centerAlignContent()
    hCol.size = new Size(COL_W, 0)
    var hTime = hCol.addText(formatHourLabel(hours[i].fxTime))
    hTime.font = Font.regularRoundedSystemFont(9); hTime.textColor = new Color("ffffff", 0.5); hTime.centerAlignText()
    hCol.addSpacer(2)
    var hIcon = hCol.addImage(sfImage(getSFIcon(hours[i].icon), 16)); hIcon.imageSize = new Size(16, 16)
    hCol.addSpacer(2)
    var hTemp = hCol.addText(hours[i].temp + "°")
    hTemp.font = Font.mediumSystemFont(11); hTemp.textColor = Color.white(); hTemp.centerAlignText()
  }

  // ========== 分割线 ==========
  addDivider(w, 0.12)

  // ========== 7 日预报 ★ 温度条 65→90，内容撑到右边 ==========
  addSectionTitle(w, "7 日天气预报")
  w.addSpacer(6)

  var globalMin = Infinity, globalMax = -Infinity
  for (var j = 0; j < daily.length; j++) {
    var tMin = parseInt(daily[j].tempMin, 10), tMax = parseInt(daily[j].tempMax, 10)
    if (tMin < globalMin) globalMin = tMin
    if (tMax > globalMax) globalMax = tMax
  }

  var days = daily.slice(0, 7)
  var BAR_W = 90

  for (var k = 0; k < days.length; k++) {
    var row = w.addStack()
    row.layoutHorizontally(); row.centerAlignContent()

    var dayLabel = row.addText(formatDayShort(days[k].fxDate))
    dayLabel.font = k === 0 ? Font.semiboldSystemFont(12) : Font.regularSystemFont(12)
    dayLabel.textColor = k === 0 ? Color.white() : new Color("ffffff", 0.85)
    dayLabel.lineLimit = 1

    row.addSpacer(8)
    var dIcon = row.addImage(sfImage(getSFIcon(days[k].iconDay), 14)); dIcon.imageSize = new Size(14, 14)
    row.addSpacer(6)
    var dDesc = row.addText(getWeatherDesc(days[k].iconDay))
    dDesc.font = Font.regularSystemFont(10); dDesc.textColor = new Color("ffffff", 0.5)

    row.addSpacer()
    var lo = row.addText(days[k].tempMin + "°")
    lo.font = Font.regularSystemFont(12); lo.textColor = new Color("ffffff", 0.45)
    row.addSpacer(4)

    var bar = row.addImage(
      drawTempBar(parseInt(days[k].tempMin, 10), parseInt(days[k].tempMax, 10), globalMin, globalMax, BAR_W)
    )
    bar.imageSize = new Size(BAR_W, 6)

    row.addSpacer(4)
    var hi = row.addText(days[k].tempMax + "°")
    hi.font = Font.mediumSystemFont(12); hi.textColor = Color.white()

    if (k < days.length - 1) w.addSpacer(5)
  }

  return w
}

// =============================================
//  错误占位
// =============================================
function buildError(message, isLock) {
  var w = new ListWidget()
  if (!isLock) w.backgroundGradient = createBg("100")
  w.setPadding(12, 16, 12, 16)
  w.addSpacer()
  var t = w.addText(message); t.font = Font.regularSystemFont(isLock ? 11 : 14); t.textColor = Color.white(); t.centerAlignText()
  w.addSpacer(); return w
}

// =============================================
//  设置 / 菜单
// =============================================
async function addCityFlow(apiKey) {
  var a = new Alert(); a.title = "添加城市"; a.addTextField("城市名称", ""); a.addAction("搜索"); a.addCancelAction("取消")
  var r = await a.presentAlert(); if (r === -1) return null
  var name = a.textFieldValue(0).trim(); if (!name) return null
  try { var city = await lookupCity(name, apiKey); if (city) return { name: city.name, id: city.id } } catch (e) {}
  var e = new Alert(); e.title = "未找到"; e.message = "无法找到「" + name + "」"; e.addAction("确定"); await e.presentAlert()
  return null
}

async function showSetup(existing) {
  while (true) {
    var a = new Alert(); a.title = "天气小组件设置"; a.message = "请输入和风天气 API Key"
    a.addTextField("API Key", existing ? existing.apiKey : ""); a.addAction("下一步"); a.addCancelAction("取消")
    var r = await a.presentAlert(); if (r === -1) return null
    var k = a.textFieldValue(0).trim()
    if (!k) { var e = new Alert(); e.title = "请输入 API Key"; e.addAction("确定"); await e.presentAlert(); continue }
    var city = await addCityFlow(k); if (!city) continue
    var cfg = { apiKey: k, cities: [city], active: 0 }; saveConfig(cfg); clearCache()
    var ok = new Alert(); ok.title = "设置成功"; ok.message = "城市: " + city.name; ok.addAction("确定"); await ok.presentAlert()
    return cfg
  }
}

async function showCityMenu(cfg) {
  while (true) {
    var a = new Alert(); a.title = "城市管理"
    a.message = "当前: " + cfg.cities[cfg.active].name + " (" + (cfg.active + 1) + "/" + cfg.cities.length + ")"
    for (var i = 0; i < cfg.cities.length; i++) a.addAction((i === cfg.active ? "● " : "   ") + cfg.cities[i].name)
    a.addAction("＋ 添加城市"); a.addCancelAction("返回")
    var ch = await a.presentAlert(); if (ch === -1) return cfg
    if (ch < cfg.cities.length) { cfg.active = ch; saveConfig(cfg); continue }
    var nc = await addCityFlow(cfg.apiKey)
    if (nc) { var dup = false; for (var j = 0; j < cfg.cities.length; j++) if (cfg.cities[j].id === nc.id) dup = true; if (!dup) { cfg.cities.push(nc); cfg.active = cfg.cities.length - 1; saveConfig(cfg) } }
  }
}

async function showMainMenu(cfg) {
  while (true) {
    var city = cfg.cities[cfg.active]
    var a = new Alert(); a.title = "天气小组件"
    a.message = city.name + " · " + cfg.apiKey.substring(0, 6) + "**** · " + cfg.cities.length + "城"
    a.addAction("小组件"); a.addAction("中组件"); a.addAction("大组件")
    a.addAction("锁屏圆"); a.addAction("锁屏矩"); a.addAction("锁屏文")
    a.addAction("城市管理"); a.addAction("修改设置"); a.addAction("清除缓存"); a.addCancelAction("退出")
    var ch = await a.presentAlert(); if (ch === -1) { Script.complete(); return }
    if (ch === 7) { var n = await showSetup(cfg); if (n) cfg = n; continue }
    if (ch === 8) { clearCache(); var ok = new Alert(); ok.title = "已清除"; ok.addAction("确定"); await ok.presentAlert(); continue }
    if (ch === 6) { cfg = await showCityMenu(cfg); continue }
    var data; try { data = await fetchAll(cfg) } catch (err) { var er = new Alert(); er.title = "错误"; er.message = err.message; er.addAction("确定"); await er.presentAlert(); continue }
    var builders = [buildSmall, buildMedium, buildLarge, buildLockCircular, buildLockRect, buildLockInline]
    var presenters = [
      function (w) { return w.presentSmall() },
      function (w) { return w.presentMedium() },
      function (w) { return w.presentLarge() },
      function (w) { return typeof w.presentAccessoryCircular === "function" ? w.presentAccessoryCircular() : w.presentSmall() },
      function (w) { return typeof w.presentAccessoryRectangular === "function" ? w.presentAccessoryRectangular() : w.presentMedium() },
      function (w) { return typeof w.presentAccessoryInline === "function" ? w.presentAccessoryInline() : w.presentSmall() }
    ]
    await presenters[ch](builders[ch](data))
  }
}

// =============================================
//  主程序
// =============================================
async function main() {
  var cfg = loadConfig()
  if (!cfg) {
    if (config.widgetFamily) {
      var isLock = (config.widgetFamily || "").indexOf("accessory") === 0
      Script.setWidget(buildError("请先在 App 中运行脚本完成设置", isLock))
      Script.complete(); return
    }
    cfg = await showSetup(null); if (!cfg) { Script.complete(); return }
  }
  var family = config.widgetFamily
  if (family) {
    var data; try { data = await fetchAll(cfg) } catch (err) {
      Script.setWidget(buildError("⚠ " + (err.message || "获取失败"), family.indexOf("accessory") === 0))
      Script.complete(); return
    }
    var map = { small: buildSmall, medium: buildMedium, large: buildLarge,
      accessoryCircular: buildLockCircular, accessoryRectangular: buildLockRect, accessoryInline: buildLockInline }
    if (map[family]) Script.setWidget(map[family](data))
    else Script.setWidget(buildError("不支持: " + family, false))
    Script.complete(); return
  }
  await showMainMenu(cfg); Script.complete()
}

await main()
