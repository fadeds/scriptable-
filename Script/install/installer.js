// ==========================================
//  Scriptable 多合一安装器
// ==========================================

Script.Installer = async function () {

  // ========== 远程配置 ==========
  var REPO_BASE = "https://raw.githubusercontent.com/fadeds/scriptable-/main/Script/scriptable/"

  // ========== 脚本注册表 ==========
  // 以后新增组件，只需在这里加一项
  var SCRIPTS = [
    {
      name: "天气小组件",
      file: "tianqi.js",
      desc: "和风天气 · SF Symbols · 空气质量 · 多城市 · 锁屏"
    }
    // 以后加更多：
    // { name: "电量小组件", file: "dianliang.js", desc: "电池电量 · 充电状态" },
    // { name: "倒数日",     file: "daoshuri.js",  desc: "纪念日 · 倒计时" }
  ]

  // ========== 文件管理 ==========
  var fm = FileManager.iCloud()
  var dir = fm.documentsDirectory()

  // ========== 下载函数 ==========
  async function downloadScript(fileName) {
    var url = REPO_BASE +'/'+ fileName
    console.log("正在下载 " + REPO_BASE +'/'+ fileName + " ...")
    var req = new Request(url)
    req.timeoutInterval = 30
    var code = await req.loadString()
    if (!code || code.trim().charAt(0) === "<") {
      throw new Error("下载失败: " + fileName + "（返回了网页而非代码）")
    }
    return code
  }

  // ========== 安装单个脚本 ==========
  async function installScript(script) {
    var code = await downloadScript(script.file)
    var path = fm.joinPath(dir, script.file)
    fm.writeString(path, code)
    return true
  }

  // ========== 主菜单 ==========
  while (true) {
    var alert = new Alert()
    alert.title = "脚本安装器"
    alert.message = "共 " + SCRIPTS.length + " 个可用脚本"

    for (var i = 0; i < SCRIPTS.length; i++) {
      var path = fm.joinPath(dir, SCRIPTS[i].file)
      var exists = fm.fileExists(path)
      alert.addAction((exists ? "🔄 " : "📦 ") + SCRIPTS[i].name)
    }
    alert.addAction("⚡ 一键全部安装")
    alert.addCancelAction("退出")

    var choice = await alert.presentAlert()
    if (choice === -1) { Script.complete(); return }

    // ---- 一键全部安装 ----
    if (choice === SCRIPTS.length) {
      var ok = 0, fail = 0
      for (var k = 0; k < SCRIPTS.length; k++) {
        try {
          await installScript(SCRIPTS[k])
          ok++
        } catch (e) {
          fail++
        }
      }
      var done = new Alert()
      done.title = "安装完成"
      done.message = "成功 " + ok + " 个" + (fail > 0 ? "，失败 " + fail + " 个" : "")
      done.addAction("确定")
      await done.presentAlert()
      continue
    }

    // ---- 单个脚本详情 ----
    var s = SCRIPTS[choice]
    var filePath = fm.joinPath(dir, s.file)
    var existsNow = fm.fileExists(filePath)

    var detail = new Alert()
    detail.title = s.name
    detail.message = s.desc + "\n\n文件: " + s.file
    detail.addAction(existsNow ? "🔄 覆盖更新" : "📦 安装")
    if (existsNow) detail.addDestructiveAction("🗑 卸载")
    detail.addCancelAction("返回")

    var dc = await detail.presentAlert()
    if (dc === -1) continue

    // 卸载
    if (existsNow && dc === 1) {
      fm.remove(filePath)
      var d2 = new Alert()
      d2.title = "已卸载"
      d2.message = s.name + " 已删除"
      d2.addAction("确定")
      await d2.presentAlert()
      continue
    }

    // 安装/更新
    try {
      await installScript(s)
      var ok2 = new Alert()
      ok2.title = "安装成功"
      ok2.message = s.name + " 已安装\n\n可在脚本列表运行，\n也可长按桌面添加小组件"
      ok2.addAction("确定")
      await ok2.presentAlert()
    } catch (e) {
      var err = new Alert()
      err.title = "安装失败"
      err.message = e.message
      err.addAction("确定")
      await err.presentAlert()
    }
  }
}
