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


## 文件结构

```text
index.html             网页入口
style.css              桌面与手机样式
app.js                 状态、绘图和事件处理
core.js                筛选、统计、选区和 CSV 纯函数
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
