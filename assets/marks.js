/* Marks and Grades: percentage, CGPA converter, SGPA / CGPA, marks needed, attendance. Everything runs in the browser. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var num = function (v) { v = String(v == null ? '' : v).replace(/,/g, '').replace('%', '').trim(); if (!/^-?\d*\.?\d+$/.test(v)) return NaN; return parseFloat(v); };
  var f2 = function (x) { return (Math.round(x * 100) / 100).toFixed(2).replace(/\.?0+$/, function (m) { return m.indexOf('.') === 0 && m.length < 3 ? m : ''; }); };
  var r2 = function (x) { var s = (Math.round((x + 1e-9) * 100) / 100).toFixed(2); return s.replace(/0$/, '').replace(/\.0$/, ''); };
  var store = { get: function (k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }, set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } } };
  function copyBtn(text) { return '<p class="mk-cta"><button class="btn sm" type="button" data-copy="' + esc(text) + '">Copy the working</button></p>'; }
  function bad(el, msg) { el.hidden = false; el.innerHTML = '<p>' + esc(msg) + '</p>'; }

  /* ---------- percentage ---------- */
  var pcRows = $('pc-rows');
  if (pcRows) {
    var pcOut = $('pc-out'), rows = store.get('mk-pc', null) || [['', '', '100'], ['', '', '100'], ['', '', '100'], ['', '', '100'], ['', '', '100']];
    var draw = function () {
      pcRows.innerHTML = rows.map(function (r, i) {
        return '<div class="mk-row"><input type="text" aria-label="Subject ' + (i + 1) + '" placeholder="Subject ' + (i + 1) + '" value="' + esc(r[0]) + '" data-i="' + i + '" data-k="0">' +
          '<input type="text" inputmode="decimal" aria-label="Marks scored in subject ' + (i + 1) + '" placeholder="Marks" value="' + esc(r[1]) + '" data-i="' + i + '" data-k="1">' +
          '<input type="text" inputmode="decimal" aria-label="Maximum marks of subject ' + (i + 1) + '" placeholder="Out of" value="' + esc(r[2]) + '" data-i="' + i + '" data-k="2">' +
          '<button type="button" class="mk-x" aria-label="Remove subject ' + (i + 1) + '" data-del="' + i + '">×</button></div>';
      }).join('');
    };
    var calc = function () {
      store.set('mk-pc', rows);
      var list = [], err = '';
      rows.forEach(function (r, i) {
        if (r[1] === '' ) return;
        var m = num(r[1]), x = num(r[2]);
        if (isNaN(m) || isNaN(x) || x <= 0 || m < 0) { err = 'Check row ' + (i + 1) + ': marks and maximum must be numbers.'; return; }
        if (m > x) { err = 'Row ' + (i + 1) + ': marks are more than the maximum.'; return; }
        list.push({ n: r[0] || 'Subject ' + (i + 1), m: m, x: x, p: m / x, first: i === 0 });
      });
      if (err) return bad(pcOut, err);
      if (!list.length) { pcOut.hidden = true; return; }
      var best = +$('pc-best').value, must = $('pc-must').value === '1', used = list, left = [];
      if (best && list.length > best) {
        var fixed = must ? list.filter(function (s) { return s.first; }) : [], rest = list.filter(function (s) { return fixed.indexOf(s) < 0; }).sort(function (a, b) { return b.p - a.p || b.m - a.m; });
        used = fixed.concat(rest.slice(0, best - fixed.length)); left = rest.slice(best - fixed.length);
      }
      var tm = 0, tx = 0; used.forEach(function (s) { tm += s.m; tx += s.x; });
      var pct = tm / tx * 100, label = best && list.length > best ? 'Best ' + best + (must ? ' with ' + used[0].n : '') : 'All ' + list.length + ' subject' + (list.length === 1 ? '' : 's');
      var work = used.map(function (s) { return s.n + ' ' + r2(s.m) + '/' + r2(s.x); }).join(', ');
      pcOut.hidden = false;
      pcOut.innerHTML = '<h2>' + esc(label) + '</h2><p class="big">' + r2(pct) + '%</p><dl class="facts"><dt>Total</dt><dd>' + r2(tm) + ' out of ' + r2(tx) + '</dd><dt>Working</dt><dd>' + r2(tm) + ' ÷ ' + r2(tx) + ' × 100 = ' + r2(pct) + '%</dd>' +
        '<dt>Counted</dt><dd>' + esc(work) + '</dd>' + (left.length ? '<dt>Left out</dt><dd>' + esc(left.map(function (s) { return s.n + ' ' + r2(s.m) + '/' + r2(s.x); }).join(', ')) + '</dd>' : '') + '</dl>' +
        copyBtn(label + ': ' + work + '. Total ' + r2(tm) + ' out of ' + r2(tx) + ' = ' + r2(pct) + '%');
    };
    pcRows.addEventListener('input', function (e) { var t = e.target; if (t.dataset.i === undefined) return; rows[+t.dataset.i][+t.dataset.k] = t.value; calc(); });
    pcRows.addEventListener('click', function (e) { var b = e.target.closest('[data-del]'); if (!b) return; rows.splice(+b.dataset.del, 1); if (!rows.length) rows.push(['', '', '100']); draw(); calc(); });
    $('pc-add').addEventListener('click', function () { rows.push(['', '', rows.length ? rows[rows.length - 1][2] : '100']); draw(); pcRows.lastChild.querySelector('input').focus(); });
    $('pc-clear').addEventListener('click', function () { rows = [['', '', '100'], ['', '', '100'], ['', '', '100'], ['', '', '100'], ['', '', '100']]; draw(); calc(); });
    $('pc-best').addEventListener('change', calc); $('pc-must').addEventListener('change', calc);
    draw(); calc();
  }

  /* ---------- CGPA <-> percentage ---------- */
  var cvRule = $('cv-rule');
  if (cvRule) {
    var cvC = $('cv-c'), cvP = $('cv-p'), cvOut = $('cv-out'), RULES = {
      cbse: { a: 9.5, b: 0, name: 'CBSE class 9 and 10', f: '9.5 × CGPA', src: 'CBSE Circular No. 24 of 28 May 2010. CBSE calls the result an indicative percentage.' },
      vtu: { a: 10, b: -7.5, name: 'VTU', f: '(CGPA − 0.75) × 10', src: 'VTU regulations for B.E./B.Tech. effective from 2021-22, clause 21OB12.2.' },
      anna: { a: 10, b: 0, name: 'Anna University', f: 'CGPA × 10', src: 'Anna University Regulations 2021 (affiliated institutions), clause 15.5.3.' }
    };
    var rule = function () {
      if (cvRule.value !== 'own') return RULES[cvRule.value];
      var a = num($('cv-a').value), b = num($('cv-b').value);
      return { a: a, b: b, name: 'Your formula', f: 'CGPA × ' + (isNaN(a) ? '?' : r2(a)) + (b ? (b < 0 ? ' − ' + r2(-b) : ' + ' + r2(b)) : ''), src: 'The formula you typed. Make sure it is the one printed by your own university.' };
    };
    var conv = function (from) {
      $('cv-own').hidden = cvRule.value !== 'own';
      var R = rule(), c, p;
      if (isNaN(R.a) || isNaN(R.b) || R.a === 0) return bad(cvOut, 'Type the two numbers of your formula. The first cannot be zero.');
      if (from === 'p') { p = num(cvP.value); if (cvP.value.trim() === '') { cvOut.hidden = true; return; } if (isNaN(p)) return bad(cvOut, 'Type the percentage as a number, such as 77.9.'); c = (p - R.b) / R.a; cvC.value = r2(c); }
      else { c = num(cvC.value); if (cvC.value.trim() === '') { cvOut.hidden = true; return; } if (isNaN(c)) return bad(cvOut, 'Type the CGPA as a number, such as 8.2.'); p = R.a * c + R.b; cvP.value = r2(p); }
      var warn = '';
      if (c > 10 || c < 0) warn = '<p><b>Check the number.</b> A CGPA on a 10-point scale lies between 0 and 10.</p>';
      else if (p > 100 || p < 0) warn = '<p><b>Check the formula.</b> The result is outside 0 to 100.</p>';
      cvOut.hidden = false;
      cvOut.innerHTML = '<h2>' + esc(R.name) + ': ' + esc(R.f) + '</h2><p class="big">CGPA ' + r2(c) + ' = ' + r2(p) + '%</p>' + warn + '<p class="hint">Source: ' + esc(R.src) + '</p>' +
        copyBtn('CGPA ' + r2(c) + ' = ' + r2(p) + '% (' + R.name + ': ' + R.f + ')');
    };
    cvC.addEventListener('input', function () { conv('c'); }); cvP.addEventListener('input', function () { conv('p'); });
    cvRule.addEventListener('change', function () { conv('c'); }); $('cv-a').addEventListener('input', function () { conv('c'); }); $('cv-b').addEventListener('input', function () { conv('c'); });
    conv('c');
  }

  /* ---------- SGPA and CGPA ---------- */
  var sgRows = $('sg-rows');
  if (sgRows) {
    var SC = { ugc: [['O', 10], ['A+', 9], ['A', 8], ['B+', 7], ['B', 6], ['C', 5], ['P', 4], ['F', 0]], vtu: [['S', 10], ['A', 9], ['B', 8], ['C', 7], ['D', 6], ['E', 4], ['F', 0]], anna: [['O', 10], ['A+', 9], ['A', 8], ['B+', 7], ['B', 6], ['C', 5], ['U', 0]] };
    var sg = [['', ''], ['', ''], ['', ''], ['', ''], ['', '']], sgOut = $('sg-out'), scale = $('sg-scale');
    var sgDraw = function () {
      var sc = SC[scale.value];
      sgRows.innerHTML = sg.map(function (r, i) {
        return '<div class="mk-row mk-row2"><input type="text" inputmode="decimal" aria-label="Credits of course ' + (i + 1) + '" placeholder="Credits" value="' + esc(r[0]) + '" data-i="' + i + '" data-k="0">' +
          (sc ? '<select aria-label="Grade of course ' + (i + 1) + '" data-i="' + i + '" data-k="1"><option value="">Grade</option>' + sc.map(function (g) { return '<option value="' + g[1] + '"' + (String(r[1]) === String(g[1]) ? ' selected' : '') + '>' + g[0] + ' (' + g[1] + ')</option>'; }).join('') + '</select>'
            : '<input type="text" inputmode="decimal" aria-label="Grade point of course ' + (i + 1) + '" placeholder="Grade point" value="' + esc(r[1]) + '" data-i="' + i + '" data-k="1">') +
          '<button type="button" class="mk-x" aria-label="Remove course ' + (i + 1) + '" data-del="' + i + '">×</button></div>';
      }).join('');
    };
    var sgCalc = function () {
      var tc = 0, tp = 0, parts = [], err = '';
      sg.forEach(function (r, i) {
        if (r[0] === '' || r[1] === '') return;
        var c = num(r[0]), g = num(r[1]);
        if (isNaN(c) || isNaN(g) || c <= 0 || g < 0 || g > 10) { err = 'Check course ' + (i + 1) + ': credits must be above 0 and the grade point between 0 and 10.'; return; }
        tc += c; tp += c * g; parts.push(r2(c) + ' × ' + r2(g));
      });
      if (err) return bad(sgOut, err);
      if (!parts.length) { sgOut.hidden = true; return; }
      var s = tp / tc;
      sgOut.hidden = false;
      sgOut.innerHTML = '<h2>SGPA</h2><p class="big">' + s.toFixed(2) + '</p><dl class="facts"><dt>Credit points</dt><dd>' + parts.join(' + ') + ' = ' + r2(tp) + '</dd><dt>Credits</dt><dd>' + r2(tc) + '</dd><dt>Working</dt><dd>' + r2(tp) + ' ÷ ' + r2(tc) + ' = ' + s.toFixed(2) + '</dd></dl>' +
        '<p class="mk-cta"><button class="btn sm" type="button" id="sg-use">Add this semester to step 2</button> <button class="btn sm ghost" type="button" data-copy="SGPA = ' + r2(tp) + ' ÷ ' + r2(tc) + ' = ' + s.toFixed(2) + '">Copy</button></p>';
      $('sg-use').addEventListener('click', function () { var e = cg.findIndex(function (r) { return r[0] === '' && r[1] === ''; }); var row = [r2(tc), s.toFixed(2)]; if (e < 0) cg.push(row); else cg[e] = row; cgDraw(); cgCalc(); $('cg').scrollIntoView({ block: 'nearest', behavior: 'smooth' }); });
    };
    sgRows.addEventListener('input', function (e) { var t = e.target; if (t.dataset.i === undefined) return; sg[+t.dataset.i][+t.dataset.k] = t.value; sgCalc(); });
    sgRows.addEventListener('change', function (e) { var t = e.target; if (t.tagName !== 'SELECT') return; sg[+t.dataset.i][1] = t.value; sgCalc(); });
    sgRows.addEventListener('click', function (e) { var b = e.target.closest('[data-del]'); if (!b) return; sg.splice(+b.dataset.del, 1); if (!sg.length) sg.push(['', '']); sgDraw(); sgCalc(); });
    $('sg-add').addEventListener('click', function () { sg.push(['', '']); sgDraw(); sgRows.lastChild.querySelector('input').focus(); });
    $('sg-clear').addEventListener('click', function () { sg = [['', ''], ['', ''], ['', ''], ['', ''], ['', '']]; sgDraw(); sgCalc(); });
    scale.addEventListener('change', function () { sg.forEach(function (r) { r[1] = ''; }); sgDraw(); sgCalc(); });
    var cgRows = $('cg-rows'), cgOut = $('cg-out'), cg = store.get('mk-cg', null) || [['', ''], ['', '']];
    var cgDraw = function () {
      cgRows.innerHTML = cg.map(function (r, i) {
        return '<div class="mk-row mk-row2"><input type="text" inputmode="decimal" aria-label="Credits of semester ' + (i + 1) + '" placeholder="Sem ' + (i + 1) + ' credits" value="' + esc(r[0]) + '" data-i="' + i + '" data-k="0">' +
          '<input type="text" inputmode="decimal" aria-label="SGPA of semester ' + (i + 1) + '" placeholder="SGPA" value="' + esc(r[1]) + '" data-i="' + i + '" data-k="1"><button type="button" class="mk-x" aria-label="Remove semester ' + (i + 1) + '" data-del="' + i + '">×</button></div>';
      }).join('');
    };
    var cgCalc = function () {
      store.set('mk-cg', cg);
      var tc = 0, tp = 0, parts = [], err = '', sum = 0, n = 0;
      cg.forEach(function (r, i) {
        if (r[0] === '' || r[1] === '') return;
        var c = num(r[0]), g = num(r[1]);
        if (isNaN(c) || isNaN(g) || c <= 0 || g < 0 || g > 10) { err = 'Check semester ' + (i + 1) + ': credits must be above 0 and the SGPA between 0 and 10.'; return; }
        tc += c; tp += c * g; sum += g; n++; parts.push(r2(c) + ' × ' + r2(g));
      });
      if (err) return bad(cgOut, err);
      if (!n) { cgOut.hidden = true; return; }
      var c2 = tp / tc;
      cgOut.hidden = false;
      cgOut.innerHTML = '<h2>CGPA over ' + n + ' semester' + (n === 1 ? '' : 's') + '</h2><p class="big">' + c2.toFixed(2) + '</p><dl class="facts"><dt>Credit points</dt><dd>' + parts.join(' + ') + ' = ' + r2(tp) + '</dd><dt>Credits</dt><dd>' + r2(tc) + '</dd><dt>Working</dt><dd>' + r2(tp) + ' ÷ ' + r2(tc) + ' = ' + c2.toFixed(2) + '</dd>' +
        (n > 1 ? '<dt>Plain average of SGPAs</dt><dd>' + (sum / n).toFixed(2) + ' (not the CGPA unless every semester has the same credits)</dd>' : '') + '</dl>' +
        '<p class="mk-cta"><a class="btn sm" href="/cgpa-to-percentage/">Convert to percentage</a> <button class="btn sm ghost" type="button" data-copy="CGPA = ' + r2(tp) + ' ÷ ' + r2(tc) + ' = ' + c2.toFixed(2) + '">Copy</button></p>';
    };
    cgRows.addEventListener('input', function (e) { var t = e.target; if (t.dataset.i === undefined) return; cg[+t.dataset.i][+t.dataset.k] = t.value; cgCalc(); });
    cgRows.addEventListener('click', function (e) { var b = e.target.closest('[data-del]'); if (!b) return; cg.splice(+b.dataset.del, 1); if (!cg.length) cg.push(['', '']); cgDraw(); cgCalc(); });
    $('cg-add').addEventListener('click', function () { cg.push(['', '']); cgDraw(); cgRows.lastChild.querySelector('input').focus(); });
    $('cg-clear').addEventListener('click', function () { cg = [['', ''], ['', '']]; cgDraw(); cgCalc(); });
    sgDraw(); cgDraw(); cgCalc();
  }

  /* ---------- marks needed ---------- */
  var mn = $('mn');
  if (mn) {
    var mnOut = $('mn-out');
    var mnCalc = function () {
      var got = num($('mn-got').value), done = num($('mn-done').value), left = num($('mn-left').value), t = num($('mn-t').value);
      if ([$('mn-got'), $('mn-done'), $('mn-left'), $('mn-t')].some(function (e) { return e.value.trim() === ''; })) { mnOut.hidden = true; return; }
      if ([got, done, left, t].some(isNaN) || done < 0 || left <= 0 || got < 0 || got > done || t <= 0 || t > 100) return bad(mnOut, 'Check the numbers: marks scored cannot be more than the maximum done, the papers left must have marks, and the target lies between 0 and 100.');
      var total = done + left, needAll = t * total / 100, need = needAll - got, bestp = (got + left) / total * 100, h = '';
      if (need <= 0) h = '<h2>Target already reached</h2><p class="big">0 more marks needed</p><p>You already have ' + r2(got) + ' of the ' + r2(needAll) + ' marks that ' + r2(t) + '% of ' + r2(total) + ' requires. Even with no more marks you would finish on ' + r2(got / total * 100) + '%.</p>';
      else if (need > left + 1e-9) h = '<h2>This target is out of reach</h2><p class="big">Needs ' + r2(need) + ' of ' + r2(left) + '</p><p>' + r2(t) + '% of ' + r2(total) + ' is ' + r2(needAll) + ' marks. You have ' + r2(got) + ', so you would need ' + r2(need) + ', but only ' + r2(left) + ' marks remain. The highest you can still reach is <b>' + r2(bestp) + '%</b>.</p>';
      else h = '<h2>You need</h2><p class="big">' + r2(need) + ' out of ' + r2(left) + '</p><p>That is ' + r2(need / left * 100) + '% of the marks still to come.</p><dl class="facts"><dt>Total needed</dt><dd>' + r2(t) + '% of ' + r2(total) + ' = ' + r2(needAll) + '</dd><dt>Already scored</dt><dd>' + r2(got) + '</dd><dt>Still needed</dt><dd>' + r2(needAll) + ' − ' + r2(got) + ' = ' + r2(need) + '</dd><dt>Best still possible</dt><dd>' + r2(bestp) + '%</dd></dl>' +
        copyBtn('For ' + r2(t) + '% of ' + r2(total) + ' I need ' + r2(needAll) + ' marks. I have ' + r2(got) + ', so I need ' + r2(need) + ' out of the remaining ' + r2(left) + '.');
      mnOut.hidden = false; mnOut.innerHTML = h;
    };
    mn.addEventListener('input', mnCalc);
    var pmOut = $('pm-out'), pmCalc = function () {
      var mx = num($('pm-max').value), p = +$('pm-p').value;
      if ($('pm-max').value.trim() === '') { pmOut.hidden = true; return; }
      if (isNaN(mx) || mx <= 0) return bad(pmOut, 'Type the maximum marks as a number above 0.');
      var x = mx * p / 100, w = Math.ceil(x - 1e-9);
      pmOut.hidden = false;
      pmOut.innerHTML = '<h2>' + p + '% of ' + r2(mx) + '</h2><p class="big">' + r2(x) + ' marks</p><p>' + (Math.abs(x - w) < 1e-9 ? 'That is a whole number: ' + w + ' marks reach the line.' : 'In whole marks, <b>' + w + '</b> reaches the line; ' + (w - 1) + ' is below it. Boards differ on rounding, so treat ' + w + ' as the safe target.') + '</p>';
    };
    $('pm').addEventListener('input', pmCalc); $('pm-p').addEventListener('change', pmCalc);
    var cnOut = $('cn-out'), cnCalc = function () {
      var c = num($('cn-c').value), d = num($('cn-d').value), l = num($('cn-l').value), t = num($('cn-t').value);
      if ([$('cn-c'), $('cn-d'), $('cn-l'), $('cn-t')].some(function (e) { return e.value.trim() === ''; })) { cnOut.hidden = true; return; }
      if ([c, d, l, t].some(isNaN) || c < 0 || c > 10 || t <= 0 || t > 10 || d <= 0 || l <= 0) return bad(cnOut, 'Check the numbers: CGPA values lie between 0 and 10, and credits must be above 0.');
      var need = (t * (d + l) - c * d) / l, bestc = (c * d + 10 * l) / (d + l), h;
      if (need > 10 + 1e-9) h = '<h2>This target is out of reach</h2><p class="big">Would need ' + r2(need) + '</p><p>An SGPA cannot be above 10. With 10 in every remaining credit the best CGPA you can reach is <b>' + bestc.toFixed(2) + '</b>.</p>';
      else if (need <= 0) h = '<h2>Target already safe</h2><p>Your credit points so far already cover a CGPA of ' + r2(t) + ' over all ' + r2(d + l) + ' credits.</p>';
      else h = '<h2>Average SGPA needed from here</h2><p class="big">' + need.toFixed(2) + '</p><dl class="facts"><dt>Points needed</dt><dd>' + r2(t) + ' × ' + r2(d + l) + ' = ' + r2(t * (d + l)) + '</dd><dt>Points held</dt><dd>' + r2(c) + ' × ' + r2(d) + ' = ' + r2(c * d) + '</dd><dt>Still needed</dt><dd>' + r2(t * (d + l) - c * d) + ' over ' + r2(l) + ' credits</dd><dt>Best still possible</dt><dd>' + bestc.toFixed(2) + '</dd></dl>';
      cnOut.hidden = false; cnOut.innerHTML = h;
    };
    $('cn').addEventListener('input', cnCalc);
  }

  /* ---------- attendance ---------- */
  var at = $('at');
  if (at) {
    var atOut = $('at-out');
    at.addEventListener('input', function () {
      var h = num($('at-h').value), a = num($('at-a').value), r = num($('at-r').value), lv = $('at-l').value.trim(), l = lv === '' ? null : num(lv);
      if ($('at-h').value.trim() === '' || $('at-a').value.trim() === '') { atOut.hidden = true; return; }
      if (isNaN(h) || isNaN(a) || isNaN(r) || h <= 0 || a < 0 || a > h || r <= 0 || r >= 100 || (l !== null && (isNaN(l) || l < 0))) return bad(atOut, 'Check the numbers: classes attended cannot be more than classes held, and the required percentage lies between 1 and 99.');
      var p = a / h * 100, q = r / 100, html = '<h2>Your attendance</h2><p class="big">' + r2(p) + '%</p><p>' + r2(a) + ' ÷ ' + r2(h) + ' × 100 = ' + r2(p) + '%. Required: ' + r2(r) + '%.</p>';
      if (p + 1e-9 >= r) { var y = Math.floor(a / q - h + 1e-9); html += '<p><b>You are at or above the line.</b> ' + (y > 0 ? 'You could miss the next ' + y + ' class' + (y === 1 ? '' : 'es') + ' and still be at ' + r2(a / (h + y) * 100) + '%. Keep a margin for illness.' : 'You cannot miss the next class without falling below it.') + '</p>'; }
      else { var x = Math.ceil((q * h - a) / (1 - q) - 1e-9); html += '<p><b>You are below the line.</b> Attend the next ' + x + ' class' + (x === 1 ? '' : 'es') + ' without a miss to reach ' + r2((a + x) / (h + x) * 100) + '%.</p>'; }
      if (l !== null && l > 0) {
        var needTot = Math.ceil(q * (h + l) - 1e-9), needMore = needTot - a;
        html += '<h3>By the end of the term</h3><p>The term will have ' + r2(h + l) + ' classes, so ' + r2(r) + '% is ' + needTot + '. ' +
          (needMore <= 0 ? 'You have already attended enough.' : needMore > l ? 'You would need ' + needMore + ' of the ' + r2(l) + ' remaining classes, which is not possible. Attending all of them gives ' + r2((a + l) / (h + l) * 100) + '%. Speak to your class teacher about condonation.' :
            'You must attend at least <b>' + needMore + '</b> of the ' + r2(l) + ' remaining classes, so you can miss at most ' + (l - needMore) + '.') + '</p>';
      }
      atOut.hidden = false; atOut.innerHTML = html;
    });
  }
})();
