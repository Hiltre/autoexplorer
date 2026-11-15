# 汽车观察室 Auto Atlas

交互式可视化作业：探索 1970—1982 年汽车样本中马力、重量与燃油经济性的关系。

## 本机打开

解压完整项目后，双击 `index.html`，用 Edge、Chrome 或 Firefox 打开。数据与 D3 已随项目打包，无须 npm、后端、API 密钥或联网下载图表库。

也可在项目目录运行 `python -m http.server 8000`，然后打开 http://localhost:8000 。Python 仅用于可选的本地预览与数据重建，在线网页本身不需要 Python。

## 功能

- 起止年份、产地类别和车型搜索。
- 横轴在发动机马力与车辆重量之间切换。
- 查看详情与矩形框选两种操作模式。
- 框选联动产地条形图、年度 MPG 中位数、摘要统计和记录表。
- 精确范围输入，支持用键盘复现选择。
- 点击产地条、年份点快速筛选；清除框选、重置全部条件。
- 表格排序、更多记录、详情固定和当前分析样本 CSV 导出。
- 响应式布局，所有图表与数据在浏览器本地运行。

## 先演示这五步

1. 重置：392 条记录，MPG 中位数 22.8，马力与 MPG 的 Pearson r 为 −0.78。
2. 点击“回到七十年代初”：1970—1974 年共 150 条，中位数 18.0。
3. 点击“看看后期的变化”：1978—1982 年共 150 条，中位数 28.9。
4. 重置后只保留日本：79 条，中位数 31.6。
5. 重置后展开精确范围，输入马力 60—100、MPG 25—40：139 条，中位数 30.0；导出 CSV 也应包含 139 条数据。

框选条件与筛选条件取交集。改变年份、产地、搜索或指标时会清除框选。不同年份是不同汽车样本，相关关系不代表因果。

## 部署到 Hiltre 的 GitHub Pages

建议仓库名：`auto-mpg-explorer`。下面的网址是按这个名称推导的预期地址，只有成功部署后才可使用。

1. 登录 GitHub，在 https://github.com/new 创建仓库，Owner 选择 `Hiltre`，Repository name 填 `auto-mpg-explorer`，选择 Public。
2. 上传本文件同目录下的全部文件和文件夹。关键是 `index.html` 必须位于仓库根目录，不要把整个 `auto-explorer` 外层文件夹再包一层上传，也不要只上传 ZIP。
3. 在仓库打开 **Settings → Pages**。
4. Source 选择 **Deploy from a branch**，Branch 选择 **main**，目录选择 **/(root)**，点击 **Save**。
5. 等待部署完成，以 Pages 页面显示的网址为准。预期是 `https://hiltre.github.io/auto-mpg-explorer/`。
6. 打开线上网页，测试筛选、框选和报告链接。代码仓库网址与演示网址不是同一个地址。

如果仓库名已存在，使用新名字，并相应替换演示地址中的仓库名称。本项目使用相对路径，可以放在项目型 GitHub Pages 的子路径下。

## 报告与提交

打开 `report.html`，填写姓名、学号、日期、实际网址，以及你本人实际完成或核对的工作和实际工时。不要把 AI 运行时间直接当作你本人的工时。点击“保存填写后的报告”可下载独立 HTML；也可以“打印或保存为 PDF”。报告格式以课程通知为准。

报告已有研究问题、数据处理、视觉编码、替代方案、交互流程、探索发现、测试说明和引用。开发阶段的 AI 辅助已如实说明；作品运行时未调用大模型。

最终提交前确认：在线演示可访问，报告个人信息已填写，代码和数据完整，引用保留。作业文档写明 11 月 15 日（周日）23:59 前部署可运行原型；报告提交入口和格式以课程通知为准。

## 文件结构

```text
index.html             网页入口
style.css              桌面与手机样式
app.js                 状态、绘图和事件处理
core.js                筛选、统计、选区和 CSV 纯函数
report.html            可填写、下载和打印的报告
favicon.svg            页面图标
.nojekyll              静态 Pages 发布标记
data/auto-mpg.data     UCI 原始数据
data/auto-mpg.names    UCI 原始说明
data/cars.json         清洗后 392 条记录
data/cars.js           浏览器本地加载的数据
data/provenance.json   来源、校验值、排除记录和独立统计
vendor/d3.v7.min.js    D3 7.9.0 分发文件
vendor/D3-LICENSE      D3 许可证
scripts/prepare_data.py 仅用标准库的数据重建脚本
```

## 数据重建

在项目目录执行 `python scripts/prepare_data.py`，从保留的 UCI 原始文件重建 JSON、浏览器数据脚本和来源记录。原始 398 条记录中有 6 条缺失马力，统一剔除后保留 392 条。没有填零或虚构记录。

## 资源引用

- Quinlan, R. (1993). Auto MPG [Dataset]. UCI Machine Learning Repository. https://doi.org/10.24432/C5859H 。数据页面：https://archive.ics.uci.edu/dataset/9/auto+mpg 。按原页面 CC BY 4.0 标注，本项目进行了缺失记录剔除与字段转换。
- D3.js：https://d3js.org/ ；刷选文档：https://d3js.org/d3-brush 。本项目本地打包 7.9.0，许可证随包保留。
- 交互构思参考：https://vega.github.io/vega-lite/examples/interactive_brush.html 。最终实现采用 D3。
- GitHub Pages：https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site 。
- 开发辅助：OpenAI Codex。代码实现、调试、数据核对和报告起草使用了 AI 辅助。
