/* Pure data operations, shared by the interface and reproducible checks. */
(function(root, factory) {
  const core = factory();
  if (typeof module === 'object' && module.exports) module.exports = core;
  else root.AutoCore = core;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';
  function filter(rows, state) {
    const query = (state.search || '').trim().toLowerCase();
    return rows.filter(d => d.year >= state.minYear && d.year <= state.maxYear &&
      state.origins.includes(d.origin) && (!query || d.name.toLowerCase().includes(query)));
  }
  function select(rows, bounds, metric) {
    if (!bounds) return rows;
    return rows.filter(d => d[metric] >= bounds.x0 && d[metric] <= bounds.x1 && d.mpg >= bounds.y0 && d.mpg <= bounds.y1);
  }
  function median(values) {
    if (!values.length) return null;
    const v = [...values].sort((a,b) => a-b), i = Math.floor(v.length / 2);
    return v.length % 2 ? v[i] : (v[i-1] + v[i]) / 2;
  }
  function correlation(rows, metric) {
    if (rows.length < 3) return null;
    const mx = rows.reduce((s,d) => s+d[metric],0)/rows.length;
    const my = rows.reduce((s,d) => s+d.mpg,0)/rows.length;
    let xy=0, xx=0, yy=0;
    for (const d of rows) {const x=d[metric]-mx,y=d.mpg-my;xy+=x*y;xx+=x*x;yy+=y*y;}
    return xx && yy ? xy/Math.sqrt(xx*yy) : null;
  }
  function summary(rows, metric) {
    return {n: rows.length, medianMpg: median(rows.map(d=>d.mpg)), medianX: median(rows.map(d=>d[metric])), r: correlation(rows,metric)};
  }
  function csv(rows) {
    const fields=['name','year','origin','horsepower','mpg','weight','cylinders'];
    const quote=value=>'"'+String(value).replace(/"/g,'""')+'"';
    return '\ufeff'+[fields.join(','),...rows.map(d=>fields.map(k=>quote(d[k])).join(','))].join('\r\n');
  }
  return {filter, select, median, correlation, summary, csv};
});
