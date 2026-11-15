/* Auto Atlas: all views share one filter state and one brush in data coordinates. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  if (!window.d3 || !window.AUTO_DATA || !window.AutoCore) {
    $('selection-status').textContent = '文件未加载完整，请解压完整项目后再打开 index.html。';
    return;
  }
  const C = window.AutoCore, data = window.AUTO_DATA;
  const origins = ['USA','Europe','Japan'];
  const names = {USA:'美国',Europe:'欧洲',Japan:'日本'};
  const colors = {USA:'#26786c',Europe:'#c58122',Japan:'#cb6754'};
  const metrics = {
    horsepower:{label:'马力', title:'发动机马力 / hp', unit:'hp', domain:[35,240]},
    weight:{label:'重量', title:'车辆重量 / lb', unit:'lb', domain:[1400,5400]}
  };
  const state = {minYear:1970,maxYear:1982,origins:[...origins],search:'',metric:'horsepower',bounds:null,mode:'inspect',sort:'mpg-desc',limit:10,pinned:null};
  let filtered = [], selected = [], dimensions, xScale, yScale, brush, brushLayer, circles;
  let syncingBrush = false, dragging = false, resizeTimer;
  const svg = d3.select('#scatter'), trend = d3.select('#trend');
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const oneDecimal = new Intl.NumberFormat('en-US',{minimumFractionDigits:1,maximumFractionDigits:1});
  const f1 = n => n == null ? '—' : oneDecimal.format(n);
  const f0 = n => n == null ? '—' : Math.round(n).toLocaleString('en-US');

  function syncControls() {
    $('year-min').value = state.minYear; $('year-max').value = state.maxYear;
    $('year-min-label').textContent = state.minYear; $('year-max-label').textContent = state.maxYear;
    $('year-label').textContent = state.minYear === state.maxYear ? state.minYear : state.minYear+'—'+state.maxYear;
    $('search').value = state.search; $('x-metric').value = state.metric;
    document.querySelectorAll('input[name=origin]').forEach(el=>el.checked=state.origins.includes(el.value));
    const full = state.origins.length === 3 && !state.search && state.metric === 'horsepower' && !state.bounds;
    document.querySelectorAll('[data-preset]').forEach(el=>{
      const p=el.dataset.preset;
      const active=full && ((p==='all'&&state.minYear===1970&&state.maxYear===1982)||(p==='early'&&state.minYear===1970&&state.maxYear===1974)||(p==='late'&&state.minYear===1978&&state.maxYear===1982));
      el.classList.toggle('active',active);el.setAttribute('aria-pressed',String(active));
    });
    const m=metrics[state.metric];
    $('scatter-title').textContent=m.label+'与燃油经济性';
    $('scatter').setAttribute('aria-label',m.label+'与燃油经济性散点图，当前筛选 '+filtered.length+' 条记录');
    $('stat-x-label').textContent=m.label+'中位数';$('stat-x-unit').textContent=m.unit;
    $('bound-x-name').textContent=m.label;
    $('inspect-mode').classList.toggle('active',state.mode==='inspect');
    $('brush-mode').classList.toggle('active',state.mode==='brush');
    $('inspect-mode').setAttribute('aria-pressed',String(state.mode==='inspect'));
    $('brush-mode').setAttribute('aria-pressed',String(state.mode==='brush'));
    $('plot-instruction').textContent=state.mode==='brush'?'拖动框选；下方统计、图表与列表同步更新。':'悬浮查看记录，点击固定详情。';
    const counts=C.filter(data,{...state,origins});
    document.querySelectorAll('[data-origin-count]').forEach(el=>el.textContent=counts.filter(d=>d.origin===el.dataset.originCount).length);
  }

  function updateFilters() {
    state.bounds=null;state.pinned=null;state.limit=10;
    clearBoundsInputs(); hideTooltip();
    filtered=C.filter(data,state);
    syncControls();drawScatter();updateSelection();
  }

  function drawScatter() {
    const width=Math.max(280,$('scatter-wrap').clientWidth),height=$('scatter-wrap').clientHeight;
    dimensions={width,height,left:53,right:20,top:28,bottom:51};
    const {left,right,top,bottom}=dimensions;
    xScale=d3.scaleLinear().domain(metrics[state.metric].domain).range([left,width-right]);
    yScale=d3.scaleLinear().domain([5,50]).range([height-bottom,top]);
    svg.attr('viewBox',`0 0 ${width} ${height}`).selectAll('*').remove();
    svg.append('title').text(metrics[state.metric].label+'与燃油经济性：每个点是一条汽车记录');
    svg.append('desc').text('颜色表示产地。筛选年份和产地，切换到框选数据进行联动；也可使用图表下方的精确范围表单。');
    svg.append('g').attr('class','grid').attr('transform',`translate(${left},0)`).call(d3.axisLeft(yScale).tickValues([10,20,30,40,50]).tickSize(-(width-left-right)));
    svg.append('g').attr('class','axis').attr('transform',`translate(0,${height-bottom})`).call(d3.axisBottom(xScale).ticks(width<450?4:6).tickSize(0).tickPadding(12).tickFormat(d3.format('d')));
    svg.append('g').attr('class','axis').attr('transform',`translate(${left-8},0)`).call(d3.axisLeft(yScale).tickValues([10,20,30,40,50]).tickSize(0).tickPadding(5));
    svg.append('text').attr('class','axis-title').attr('x',left).attr('y',14).text('燃油经济性 / MPG ↑');
    svg.append('text').attr('class','axis-title').attr('x',(left+width-right)/2).attr('y',height-8).attr('text-anchor','middle').text(metrics[state.metric].title+' →');
    circles=svg.append('g').attr('class','points').selectAll('circle').data(filtered,d=>d.id).join('circle').attr('class','car-point').attr('cx',d=>xScale(d[state.metric])).attr('cy',d=>yScale(d.mpg)).attr('r',4.4).attr('fill',d=>colors[d.origin]).attr('fill-opacity',.67).attr('stroke','#fff').attr('stroke-width',.75).attr('pointer-events','none');
    svg.append('circle').attr('id','hover-ring').attr('r',7).attr('fill','none').attr('stroke','#173e34').attr('stroke-width',1.5).attr('pointer-events','none').style('display','none');
    svg.append('rect').attr('class','inspect-hit').attr('x',left).attr('y',top).attr('width',width-left-right).attr('height',height-top-bottom).attr('fill','transparent').attr('pointer-events',state.mode==='inspect'?'all':'none').on('click',function(event){const d=nearest(event);if(d)pin(d);});
    brush=d3.brush().extent([[left,top],[width-right,height-bottom]]).on('start',()=>{dragging=true;hideTooltip();}).on('brush end',event=>{
      if(syncingBrush)return;
      const b=event.selection;
      state.bounds=b?{x0:xScale.invert(b[0][0]),x1:xScale.invert(b[1][0]),y0:yScale.invert(b[1][1]),y1:yScale.invert(b[0][1])}:null;
      state.limit=10;state.pinned=null;
      if(event.type==='end'){dragging=false;setBoundsInputs();}
      updateSelection();
    });
    brushLayer=svg.append('g').attr('class','brush').style('display',state.mode==='brush'?null:'none').call(brush);
    restoreBrush();
    svg.on('mousemove',event=>{if(dragging)return;const d=nearest(event);if(d)showTooltip(event,d);else hideTooltip();}).on('mouseleave',hideTooltip);
    $('plot-empty').hidden=filtered.length>0;
  }

  function nearest(event) {
    if(!filtered.length)return null;
    const [px,py]=d3.pointer(event,svg.node());let closest=null,best=15*15;
    for(const d of filtered){const dx=xScale(d[state.metric])-px,dy=yScale(d.mpg)-py,dist=dx*dx+dy*dy;if(dist<best){best=dist;closest=d;}}
    return closest;
  }
  function showTooltip(event,d) {
    const tip=$('tooltip');
    tip.innerHTML=`<strong>${esc(d.name)}</strong><small>${d.year} · ${names[d.origin]} · ${d.cylinders} 缸</small><div class="tooltip-grid"><span>马力 <b>${d.horsepower} hp</b></span><span>MPG <b>${d.mpg}</b></span><span>重量 <b>${f0(d.weight)} lb</b></span><span>记录编号 <b>${d.id}</b></span></div>`;
    tip.hidden=false;const box=tip.getBoundingClientRect();
    tip.style.left=Math.max(8,Math.min(event.clientX+16,window.innerWidth-box.width-8))+'px';
    tip.style.top=Math.max(8,Math.min(event.clientY+16,window.innerHeight-box.height-8))+'px';
    svg.select('#hover-ring').attr('cx',xScale(d[state.metric])).attr('cy',yScale(d.mpg)).style('display',null);
  }
  function hideTooltip(){$('tooltip').hidden=true;svg.select('#hover-ring').style('display','none');}
  window.addEventListener('scroll',hideTooltip,{passive:true});

  function restoreBrush() {
    if(!brushLayer)return;
    const b=state.bounds;
    const pixel=b?[[xScale(b.x0),yScale(b.y1)],[xScale(b.x1),yScale(b.y0)]]:null;
    syncingBrush=true;brushLayer.call(brush.move,pixel);syncingBrush=false;dragging=false;
  }
  function clearBoundsInputs(){['bound-x-min','bound-x-max','bound-y-min','bound-y-max'].forEach(id=>$(id).value='');$('bounds-error').textContent='';}
  function setBoundsInputs(){if(!state.bounds)return clearBoundsInputs();const b=state.bounds;[b.x0,b.x1,b.y0,b.y1].forEach((v,i)=>$(['bound-x-min','bound-x-max','bound-y-min','bound-y-max'][i]).value=+v.toFixed(2));}

  function updateSelection() {
    selected=C.select(filtered,state.bounds,state.metric);
    const ids=new Set(selected.map(d=>d.id));
    circles.attr('fill-opacity',d=>!state.bounds||ids.has(d.id)?.72:.10).attr('r',d=>state.pinned===d.id?6:4.4).attr('stroke',d=>state.pinned===d.id?'#173e34':'#fff');
    const s=C.summary(selected,state.metric);
    $('sample-label').textContent=state.bounds?'框选样本':'当前样本';
    $('stat-n').textContent=s.n;$('stat-context').textContent=state.bounds?'条 / 筛选 '+filtered.length+' 条':'条 / 全部 '+data.length+' 条';
    $('stat-mpg').textContent=f1(s.medianMpg);$('stat-x').textContent=state.metric==='weight'?f0(s.medianX):f1(s.medianX);$('stat-r').textContent=s.r==null?'—':s.r.toFixed(2);
    $('selection-status').textContent=state.bounds?`已框选 ${selected.length} 条 / 筛选后 ${filtered.length} 条记录`:`显示 ${filtered.length} 条记录 · ${state.minYear}—${state.maxYear}`;
    $('clear-brush').disabled=!state.bounds;$('export').disabled=!selected.length;
    if(!s.n)$('live-insight').textContent=filtered.length?'这个范围内没有记录。调整框选范围，或点击“清除框选”。':'没有符合条件的记录。请调整筛选条件。';
    else if(s.r==null)$('live-insight').textContent=`当前 ${s.n} 条记录不足以计算稳定的相关系数，或至少一个指标没有变化。可扩大选择范围。`;
    else {const direction=s.r<0?'负':'正';$('live-insight').textContent=`当前 ${s.n} 条记录中，${metrics[state.metric].label}与 MPG 的 Pearson 相关系数为 ${s.r.toFixed(2)}${Math.abs(s.r)<.1?'，线性相关较弱':'，呈'+direction+'相关'}。这是所选样本的描述，不能解释为因果关系。`;}
    drawOrigins();drawTrend();drawTable();renderDetail();syncPresetActive();
  }
  function syncPresetActive(){const full=state.origins.length===3&&!state.search&&state.metric==='horsepower'&&!state.bounds;document.querySelectorAll('[data-preset]').forEach(el=>{const p=el.dataset.preset,active=full&&((p==='all'&&state.minYear===1970&&state.maxYear===1982)||(p==='early'&&state.minYear===1970&&state.maxYear===1974)||(p==='late'&&state.minYear===1978&&state.maxYear===1982));el.classList.toggle('active',active);el.setAttribute('aria-pressed',String(active));});}

  function drawOrigins() {
    const counts=origins.map(origin=>({origin,base:filtered.filter(d=>d.origin===origin).length,n:selected.filter(d=>d.origin===origin).length}));
    const max=Math.max(1,...counts.map(d=>d.base));
    $('origin-chart').innerHTML=counts.map(d=>`<button class="bar-row" data-only-origin="${d.origin}" aria-label="只看${names[d.origin]}，当前分析 ${d.n} 条，筛选 ${d.base} 条"><span class="bar-label">${names[d.origin]}</span><span class="bar-track"><span class="bar-base" style="width:${100*d.base/max}%"></span><span class="bar-value" style="width:${100*d.n/max}%;background:${colors[d.origin]}"></span></span><span class="bar-number">${d.n}<small> / ${d.base}</small></span></button>`).join('');
    document.querySelectorAll('[data-only-origin]').forEach(el=>el.addEventListener('click',()=>{state.origins=[el.dataset.onlyOrigin];updateFilters();}));
    $('origin-caption').textContent=selected.length?`分析样本共 ${selected.length} 条。产地类别并非相同的地理层级，沿用原始数据定义。`:'当前没有分析样本。';
  }

  function drawTrend() {
    const width=Math.max(260,$('trend').clientWidth),height=$('trend').clientHeight,left=36,right=16,top=18,bottom=29;
    const tx=d3.scaleLinear().domain([1970,1982]).range([left,width-right]),ty=d3.scaleLinear().domain([0,50]).range([height-bottom,top]);
    const summarize=rows=>d3.range(1970,1983).map(year=>{const values=rows.filter(d=>d.year===year);return {year,n:values.length,mpg:C.median(values.map(d=>d.mpg))};});
    const base=summarize(filtered),pick=summarize(selected);
    trend.attr('viewBox',`0 0 ${width} ${height}`).selectAll('*').remove();
    trend.append('title').text('按车型年份汇总的 MPG 中位数');
    trend.append('g').attr('class','grid').attr('transform',`translate(${left},0)`).call(d3.axisLeft(ty).tickValues([10,20,30,40]).tickSize(-(width-left-right)));
    trend.append('g').attr('class','axis').attr('transform',`translate(0,${height-bottom})`).call(d3.axisBottom(tx).tickValues(width<350?[1970,1974,1978,1982]:[1970,1972,1974,1976,1978,1980,1982]).tickFormat(d3.format('d')).tickSize(0).tickPadding(10));
    trend.append('g').attr('class','axis').attr('transform',`translate(${left-6},0)`).call(d3.axisLeft(ty).tickValues([10,20,30,40]).tickSize(0).tickPadding(3));
    const line=d3.line().defined(d=>d.n>0).x(d=>tx(d.year)).y(d=>ty(d.mpg));
    trend.append('path').datum(base).attr('d',line).attr('fill','none').attr('stroke','#afbeb3').attr('stroke-width',2);
    const addPoints=(values,color,selectedLayer)=>trend.append('g').selectAll('circle').data(values.filter(d=>d.n)).join('circle').attr('class','trend-point').attr('cx',d=>tx(d.year)).attr('cy',d=>ty(d.mpg)).attr('r',4).attr('fill',color).attr('stroke','#fff').attr('stroke-width',1).attr('tabindex',0).attr('role','button').attr('aria-label',d=>`${d.year} 年${selectedLayer?'框选':'筛选'}样本 ${d.n} 条，MPG 中位数 ${d.mpg.toFixed(2)}。点击只看该年`).on('click',(event,d)=>{state.minYear=d.year;state.maxYear=d.year;updateFilters();}).on('keydown',(event,d)=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();state.minYear=d.year;state.maxYear=d.year;updateFilters();}}).append('title').text(d=>`${d.year} 年 · ${d.n} 条\nMPG 中位数 ${d.mpg.toFixed(2)}\n点击聚焦这一年`);
    addPoints(base,'#91a797',false);
    if(state.bounds){trend.append('path').datum(pick).attr('d',line).attr('fill','none').attr('stroke','#17675e').attr('stroke-width',2.5);addPoints(pick,'#17675e',true);}
    if(!filtered.length)trend.append('text').attr('x',width/2).attr('y',height/2).attr('text-anchor','middle').attr('class','plot-label').text('暂无年份数据');
  }

  function sortedRows(){return [...selected].sort((a,b)=>state.sort==='mpg-asc'?a.mpg-b.mpg||a.id-b.id:state.sort==='year-desc'?b.year-a.year||b.mpg-a.mpg:state.sort==='horsepower-desc'?b.horsepower-a.horsepower||a.id-b.id:b.mpg-a.mpg||a.id-b.id);}
  function drawTable() {
    const rows=sortedRows(),shown=rows.slice(0,state.limit);
    $('table-count').textContent=rows.length+' 条';
    $('records').innerHTML=shown.length?shown.map(d=>`<tr><td><button class="name-button" data-record="${d.id}" aria-label="查看 ${esc(d.name)} ${d.year} 年的详情">${esc(d.name)}</button></td><td>${d.year}</td><td><span class="dot" style="background:${colors[d.origin]}"></span>${names[d.origin]}</td><td>${d.horsepower}</td><td>${d.mpg.toFixed(1)}</td><td>${f0(d.weight)}</td></tr>`).join(''):'<tr><td colspan="6" class="table-empty">当前范围内没有记录。请调整筛选或框选。</td></tr>';
    document.querySelectorAll('[data-record]').forEach(el=>el.addEventListener('click',()=>pin(data.find(d=>d.id===+el.dataset.record))));
    $('table-status').textContent=`显示 ${shown.length} / ${rows.length} 条 · 与当前分析样本一致`;
    $('show-more').hidden=shown.length>=rows.length;
  }
  function pin(d){state.pinned=d.id;renderDetail();circles.attr('r',row=>row.id===d.id?6:4.4).attr('stroke',row=>row.id===d.id?'#173e34':'#fff');}
  function renderDetail(){const d=data.find(row=>row.id===state.pinned),el=$('detail');el.hidden=!d;if(!d)return;el.innerHTML=`<div><strong>${esc(d.name)}</strong>${d.year} 年 · ${names[d.origin]} · ${d.cylinders} 缸 · ${d.horsepower} hp · ${d.mpg} MPG · ${f0(d.weight)} lb<br>数据记录编号 ${d.id}；同名车型可能在不同年份出现。</div><button id="close-detail" class="text-button" aria-label="关闭车型详情">关闭 ×</button>`;$('close-detail').onclick=()=>{state.pinned=null;renderDetail();circles.attr('r',4.4).attr('stroke','#fff');};}

  $('year-min').addEventListener('input',event=>{state.minYear=+event.target.value;state.maxYear=Math.max(state.maxYear,state.minYear);updateFilters();});
  $('year-max').addEventListener('input',event=>{state.maxYear=+event.target.value;state.minYear=Math.min(state.minYear,state.maxYear);updateFilters();});
  document.querySelectorAll('input[name=origin]').forEach(el=>el.addEventListener('change',()=>{state.origins=[...document.querySelectorAll('input[name=origin]:checked')].map(el=>el.value);updateFilters();}));
  $('all-origins').onclick=()=>{state.origins=[...origins];updateFilters();};
  $('search').addEventListener('input',event=>{state.search=event.target.value;updateFilters();});
  $('x-metric').addEventListener('change',event=>{state.metric=event.target.value;updateFilters();});
  const reset=()=>{Object.assign(state,{minYear:1970,maxYear:1982,origins:[...origins],search:'',metric:'horsepower',bounds:null,mode:'inspect',sort:'mpg-desc',limit:10,pinned:null});$('sort').value=state.sort;updateFilters();};
  $('reset').onclick=reset;$('empty-reset').onclick=reset;
  ['inspect','brush'].forEach(mode=>$(mode+'-mode').onclick=()=>{state.mode=mode;hideTooltip();syncControls();drawScatter();updateSelection();});
  $('clear-brush').onclick=()=>{state.bounds=null;state.limit=10;state.pinned=null;clearBoundsInputs();restoreBrush();updateSelection();};
  $('bounds-form').addEventListener('submit',event=>{
    event.preventDefault();const inputs=['bound-x-min','bound-x-max','bound-y-min','bound-y-max'].map(id=>$(id).value.trim()),domain=metrics[state.metric].domain;
    if(inputs.every(v=>v==='')){$('clear-brush').click();return;}
    const [x0,x1,y0,y1]=inputs.map((v,i)=>v===''?[domain[0],domain[1],5,50][i]:Number(v));
    if(![x0,x1,y0,y1].every(Number.isFinite)||x0>=x1||y0>=y1){$('bounds-error').textContent='请输入有效数值，且最小值必须小于最大值。';return;}
    if(x0<domain[0]||x1>domain[1]||y0<5||y1>50){$('bounds-error').textContent=`范围须在当前坐标轴内：${metrics[state.metric].label} ${domain[0]}—${domain[1]}，MPG 5—50。`;return;}
    $('bounds-error').textContent='';state.bounds={x0,x1,y0,y1};state.mode='brush';state.pinned=null;state.limit=10;
    syncControls();drawScatter();updateSelection();
  });
  document.querySelectorAll('[data-preset]').forEach(el=>el.addEventListener('click',()=>{reset();const p=el.dataset.preset;if(p==='early')state.maxYear=1974;if(p==='late')state.minYear=1978;updateFilters();}));
  $('sort').addEventListener('change',event=>{state.sort=event.target.value;state.limit=10;drawTable();});
  $('show-more').onclick=()=>{state.limit+=10;drawTable();};
  $('export').onclick=()=>{const url=URL.createObjectURL(new Blob([C.csv(sortedRows())],{type:'text/csv;charset=utf-8;'})),a=document.createElement('a');a.href=url;a.download=`auto-mpg-${state.minYear}-${state.maxYear}-${selected.length}-records.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);};
  document.addEventListener('keydown',event=>{if(event.key==='Escape'){hideTooltip();state.pinned=null;renderDetail();}});
  new ResizeObserver(()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{drawScatter();updateSelection();},120);}).observe($('scatter-wrap'));
  updateFilters();
})();
