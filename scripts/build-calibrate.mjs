/**
 * Generate calibrate/index.html (Mode 1: criteria review) from the
 * Open-Facilitation-Library/method-specs eval YAMLs.
 *
 * Reads every methods/<id>/evals/<stage>.yaml, enriches each stage with its
 * title (method.md frontmatter) and goal (method.md body), and bakes the whole
 * 44-stage corpus into a single self-contained static page. The page lets a
 * practitioner of a method review that method's eval criteria stage by stage
 * (keep / reword / cut, add missing, note) and submit a pre-filled GitHub issue
 * on method-specs scoped to that stage's YAML.
 *
 * Re-run whenever the specs change:  npm run build-calibrate
 * Override the specs location:        node scripts/build-calibrate.mjs <path-to-method-specs>
 *
 * The site stays zero-build at deploy time: this only regenerates a committed
 * static file. Tracker: HAR-1236.
 */
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import yaml from 'js-yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = resolve(__dirname, '..');
const SPECS = resolve(
  process.argv[2] || process.env.METHOD_SPECS_DIR || join(SITE_ROOT, '..', 'OFL', 'method-specs'),
);
const OUT = join(SITE_ROOT, 'calibrate', 'index.html');

const REPO = 'Open-Facilitation-Library/method-specs';

if (!existsSync(join(SPECS, 'index.json'))) {
  console.error(`method-specs not found at ${SPECS}\nPass the path: node scripts/build-calibrate.mjs <path-to-method-specs>`);
  process.exit(1);
}

// ---- read the registry ------------------------------------------------------

const index = JSON.parse(readFileSync(join(SPECS, 'index.json'), 'utf-8'));

/** Split a method.md into [frontmatter object, body string]. */
function parseMethodMd(src) {
  src = src.replace(/\r\n/g, '\n'); // specs are authored with CRLF on Windows
  const m = src.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return [{}, src];
  return [yaml.load(m[1]) || {}, m[2] || ''];
}

/** Pull the `**Goal:**` line for each `## Stage: <id>` section. */
function goalsFromBody(body) {
  const goals = {};
  const re = /^##\s+Stage:\s+(\S+)\s*$/gm;
  let m;
  const marks = [];
  while ((m = re.exec(body))) marks.push({ id: m[1], at: m.index });
  for (let i = 0; i < marks.length; i++) {
    const slice = body.slice(marks[i].at, i + 1 < marks.length ? marks[i + 1].at : undefined);
    const g = slice.match(/\*\*Goal:\*\*\s*([^\n]+)/);
    if (g) goals[marks[i].id] = g[1].trim();
  }
  return goals;
}

/** A weval prompt -> a single review example {message, should[], should_not[]}. */
function exampleFromPrompt(p) {
  const msgs = Array.isArray(p?.messages) ? p.messages : [];
  const message = msgs
    .filter((x) => x && x.role === 'user')
    .map((x) => String(x.content ?? '').trim())
    .filter(Boolean)
    .join('\n');
  const list = (v) => (Array.isArray(v) ? v.map((s) => String(s).trim()).filter(Boolean) : []);
  return { message, should: list(p?.should), should_not: list(p?.should_not) };
}

const methods = [];
let stageTotal = 0;

for (const meta of index.methods) {
  if (meta.has_evals === false) continue;
  const dir = join(SPECS, 'methods', meta.id);
  const evalsDir = join(dir, 'evals');
  if (!existsSync(evalsDir)) continue;

  let fm = {};
  let goals = {};
  const mdPath = join(dir, 'method.md');
  if (existsSync(mdPath)) {
    const [front, body] = parseMethodMd(readFileSync(mdPath, 'utf-8'));
    fm = front;
    goals = goalsFromBody(body);
  }
  const titleById = {};
  for (const st of fm.stages || []) titleById[st.id] = st.title || st.id;

  // Canonical stage order = frontmatter order; then any extra eval files.
  const evalFiles = readdirSync(evalsDir).filter((f) => f.endsWith('.yaml'));
  const ordered = [];
  for (const st of fm.stages || []) {
    if (evalFiles.includes(`${st.id}.yaml`)) ordered.push(st.id);
  }
  for (const f of evalFiles) {
    const id = f.replace(/\.yaml$/, '');
    if (!ordered.includes(id)) ordered.push(id);
  }

  const stages = [];
  for (const stageId of ordered) {
    const doc = yaml.load(readFileSync(join(evalsDir, `${stageId}.yaml`), 'utf-8')) || {};
    const examples = (Array.isArray(doc.prompts) ? doc.prompts : [])
      .map(exampleFromPrompt)
      .filter((e) => e.message || e.should.length || e.should_not.length);
    if (!examples.length) continue;
    stages.push({
      id: stageId,
      title: titleById[stageId] || stageId.replace(/-/g, ' '),
      goal: goals[stageId] || '',
      criterion: String(doc.description ?? '').trim(),
      examples,
    });
  }
  if (!stages.length) continue;
  stageTotal += stages.length;
  methods.push({ id: meta.id, title: meta.title, summary: meta.summary || '', stages });
}

// ---- render -----------------------------------------------------------------

const DATA_JSON = JSON.stringify({ repo: REPO, methods }).replace(/</g, '\\u003c');

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex, nofollow" />
  <title>Calibrate — Open Facilitation Library</title>
  <meta name="description" content="Review the open eval criteria for the facilitation method you practice, stage by stage, and propose refinements in the commons." />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Schibsted+Grotesk:wght@400;500;600;700&family=Source+Sans+3:wght@400;600&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/styles.css" />
</head>
<body>
  <div class="wrap">
    <header class="topbar">
      <a class="wordmark" href="/" aria-label="Open Facilitation Library home">OFL</a>
      <nav class="topnav" aria-label="Primary">
        <a href="/facilitators/">Facilitators</a>
        <a href="/runtimes/">Runtimes</a>
        <a href="https://wiki.openfac.org">Wiki</a>
        <a href="https://github.com/Open-Facilitation-Library">GitHub</a>
      </nav>
    </header>
    <main id="app">
      <noscript>
        <section class="calib-intro">
          <p class="eyebrow">Calibration</p>
          <h1>Review the criteria.</h1>
          <p class="lead">This tool needs JavaScript to browse the method criteria. The specs themselves live at <a href="https://github.com/${REPO}">github.com/${REPO}</a>.</p>
        </section>
      </noscript>
    </main>
  </div>
  <div class="submitbar" id="submitbar" hidden>
    <div class="submitbar-inner wrap">
      <span class="progress"><strong id="jcount">0</strong> <span id="jlabel">lines marked</span></span>
      <button type="button" id="submit" class="btn">Open a GitHub issue</button>
    </div>
  </div>
  <script>
  var DATA = ${DATA_JSON};
  var METHODS = DATA.methods, REPO = DATA.repo;
  var STORE = 'ofl-calibrate-v1';
  var reviews = (function(){ try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch(e){ return {}; } })();
  function persist(){ try { localStorage.setItem(STORE, JSON.stringify(reviews)); } catch(e){} }
  function recKey(m,s){ return m.id + '/' + s.id; }
  function rec(m,s){ var k = recKey(m,s); return reviews[k] || (reviews[k] = { lines:{}, added:'', note:'' }); }
  function reviewedCount(m,s){ var r = reviews[recKey(m,s)]; if(!r) return 0; var n = Object.keys(r.lines).length; if((r.added||'').trim()) n++; if((r.note||'').trim()) n++; return n; }
  function esc(t){ return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function findMethod(id){ for(var i=0;i<METHODS.length;i++){ if(METHODS[i].id===id) return METHODS[i]; } return null; }
  function findStage(m,id){ for(var i=0;i<m.stages.length;i++){ if(m.stages[i].id===id) return m.stages[i]; } return null; }

  var app = document.getElementById('app');
  var bar = document.getElementById('submitbar');

  function home(){
    bar.hidden = true;
    var rows = METHODS.map(function(m){
      var done = m.stages.filter(function(s){ return reviewedCount(m,s) > 0; }).length;
      var tag = done ? '<span class="pick-done">'+done+' reviewed</span>' : '';
      return '<a class="pick-row" href="#'+m.id+'">'
        + '<span class="pick-name">'+esc(m.title)+'</span>'
        + '<span class="pick-meta">'+m.stages.length+' stage'+(m.stages.length===1?'':'s')+' '+tag+'<span class="pick-arrow">&#8594;</span></span>'
        + '</a>';
    }).join('');
    app.innerHTML =
      '<section class="calib-intro">'
      + '<p class="eyebrow">Calibration</p>'
      + '<h1>Review the criteria.</h1>'
      + '<p class="lead">These are the open criteria each AI facilitator is measured against, one set per stage of each method. If you practice one of these methods, tell us where the criteria match how you actually run it, and where they do not. Your refinements open a pre-filled issue on GitHub, so the standard stays in the commons.</p>'
      + '<details class="rubric"><summary>How this works</summary>'
      + '<p>Pick a method you know, then a stage. For each line, mark whether to keep it, reword it, or cut it, add anything missing, and leave a note. Submitting opens a GitHub issue scoped to that stage so a maintainer can fold your judgment into the spec. Nothing is sent automatically and your progress stays in this browser until you submit.</p></details>'
      + '</section>'
      + '<div class="pick-list">'+rows+'</div>';
  }

  function method(m){
    bar.hidden = true;
    var rows = m.stages.map(function(s){
      var n = reviewedCount(m,s);
      var tag = n ? '<span class="pick-done">reviewed</span>' : '';
      return '<a class="pick-row" href="#'+m.id+'/'+s.id+'">'
        + '<span class="pick-name">'+esc(s.title)+'</span>'
        + '<span class="pick-meta">'+tag+'<span class="pick-arrow">&#8594;</span></span>'
        + '</a>';
    }).join('');
    app.innerHTML =
      '<nav class="crumb"><a href="#">All methods</a></nav>'
      + '<section class="calib-intro">'
      + '<p class="eyebrow">Method</p>'
      + '<h1>'+esc(m.title)+'</h1>'
      + (m.summary ? '<p class="lead">'+esc(m.summary)+'</p>' : '')
      + '</section>'
      + '<div class="pick-list">'+rows+'</div>';
  }

  function critLine(m, s, exIdx, kind, i, text){
    var k = exIdx+':'+kind+':'+i;
    var saved = rec(m,s).lines[k] || {};
    var opt = function(d,label){ return '<button type="button" class="lopt'+(saved.d===d?' on':'')+'" data-k="'+k+'" data-d="'+d+'">'+label+'</button>'; };
    return '<div class="crit">'
      + '<p class="crit-text">'+esc(text)+'</p>'
      + '<div class="line-opts">'+opt('keep','keep')+opt('reword','reword')+opt('cut','cut')+'</div>'
      + '<input type="text" class="why reword" data-k="'+k+'" placeholder="suggested rewording" value="'+esc(saved.t||'')+'"'+(saved.d==='reword'?'':' hidden')+' />'
      + '</div>';
  }

  function stage(m, s){
    var r = rec(m,s);
    var ex = s.examples.map(function(e, ei){
      var groups = '';
      if(e.should.length){
        groups += '<div class="crit-group"><p class="crit-label crit-should">Should</p>'
          + e.should.map(function(t,i){ return critLine(m,s,ei,'should',i,t); }).join('') + '</div>';
      }
      if(e.should_not.length){
        groups += '<div class="crit-group"><p class="crit-label crit-shouldnot">Should not</p>'
          + e.should_not.map(function(t,i){ return critLine(m,s,ei,'shouldnot',i,t); }).join('') + '</div>';
      }
      return '<div class="example">'
        + (e.message ? '<p class="ex-msg"><span class="ex-tag">Participant</span>'+esc(e.message)+'</p>' : '')
        + groups + '</div>';
    }).join('');

    app.innerHTML =
      '<nav class="crumb"><a href="#">All methods</a> <span>/</span> <a href="#'+m.id+'">'+esc(m.title)+'</a></nav>'
      + '<section class="stage-head">'
      + '<p class="eyebrow">'+esc(m.title)+'</p>'
      + '<h1>'+esc(s.title)+'</h1>'
      + (s.goal ? '<p class="stage-goal">'+esc(s.goal)+'</p>' : '')
      + '<p class="stage-file"><span class="ex-tag">eval</span>methods/'+m.id+'/evals/'+s.id+'.yaml</p>'
      + '</section>'
      + ex
      + '<div class="add-block"><label for="addc">Missing criteria to add</label>'
      + '<textarea id="addc" rows="2" placeholder="one per line, optional">'+esc(r.added||'')+'</textarea></div>'
      + '<div class="note-block"><label for="notec">Overall note</label>'
      + '<textarea id="notec" rows="2" placeholder="anything else about how you run this stage, optional">'+esc(r.note||'')+'</textarea></div>';

    // line decisions
    app.querySelectorAll('.lopt').forEach(function(btn){
      btn.addEventListener('click', function(){
        var k = btn.getAttribute('data-k'), d = btn.getAttribute('data-d');
        var line = rec(m,s).lines[k] || (rec(m,s).lines[k] = {});
        if(line.d === d){ delete rec(m,s).lines[k]; } else { line.d = d; }
        // refresh this crit's buttons + reword input
        var crit = btn.closest('.crit');
        crit.querySelectorAll('.lopt').forEach(function(b){ b.classList.toggle('on', (rec(m,s).lines[k]||{}).d === b.getAttribute('data-d')); });
        var inp = crit.querySelector('.reword');
        var isReword = (rec(m,s).lines[k]||{}).d === 'reword';
        inp.hidden = !isReword;
        if(isReword){ inp.focus(); }
        persist(); progress(m,s);
      });
    });
    app.querySelectorAll('.reword').forEach(function(inp){
      inp.addEventListener('input', function(){
        var k = inp.getAttribute('data-k');
        var line = rec(m,s).lines[k] || (rec(m,s).lines[k] = { d:'reword' });
        line.t = inp.value;
        persist();
      });
    });
    var addc = app.querySelector('#addc'); addc.addEventListener('input', function(){ rec(m,s).added = addc.value; persist(); progress(m,s); });
    var notec = app.querySelector('#notec'); notec.addEventListener('input', function(){ rec(m,s).note = notec.value; persist(); progress(m,s); });

    bar.hidden = false;
    document.getElementById('submit').onclick = function(){ submit(m,s); };
    progress(m,s);
  }

  function progress(m,s){
    var n = reviewedCount(m,s);
    document.getElementById('jcount').textContent = n;
    document.getElementById('jlabel').textContent = n === 1 ? 'change marked' : 'changes marked';
  }

  function submit(m,s){
    var r = rec(m,s);
    var L = [];
    L.push('Criteria review for \`'+m.id+'\` / \`'+s.id+'\` ('+s.title+').');
    L.push('');
    L.push('File: \`methods/'+m.id+'/evals/'+s.id+'.yaml\`');
    L.push('');
    L.push('Reviewed by a practitioner of this method. Marks below; a maintainer can fold accepted edits into the spec.');
    L.push('');
    s.examples.forEach(function(e, ei){
      L.push('### Example '+(ei+1));
      if(e.message){ L.push('Participant: ' + e.message.replace(/\\n/g,' ')); L.push(''); }
      var dump = function(kind, label, arr){
        if(!arr.length) return;
        L.push('**'+label+'**');
        arr.forEach(function(t,i){
          var d = (r.lines[ei+':'+kind+':'+i]||{});
          var mark = d.d === 'reword' ? ('reword -> "'+(d.t||'').trim()+'"') : d.d === 'cut' ? 'cut' : d.d === 'keep' ? 'keep' : 'no change';
          L.push('- ['+mark+'] '+t);
        });
        L.push('');
      };
      dump('should', 'Should', e.should);
      dump('shouldnot', 'Should not', e.should_not);
    });
    if((r.added||'').trim()){
      L.push('### Missing criteria to add');
      r.added.split('\\n').map(function(x){return x.trim();}).filter(Boolean).forEach(function(x){ L.push('- '+x); });
      L.push('');
    }
    if((r.note||'').trim()){ L.push('### Note'); L.push(r.note.trim()); L.push(''); }

    var title = 'Calibrate: ' + m.id + '/' + s.id;
    var url = 'https://github.com/' + REPO + '/issues/new?labels=' + encodeURIComponent('calibration')
      + '&title=' + encodeURIComponent(title)
      + '&body=' + encodeURIComponent(L.join('\\n'));
    window.open(url, '_blank', 'noopener');
  }

  function route(){
    var h = location.hash.replace(/^#/,'');
    if(!h){ home(); window.scrollTo(0,0); return; }
    var parts = h.split('/');
    var m = findMethod(parts[0]);
    if(m && parts[1]){ var s = findStage(m, parts[1]); if(s){ stage(m,s); window.scrollTo(0,0); return; } }
    if(m){ method(m); window.scrollTo(0,0); return; }
    home(); window.scrollTo(0,0);
  }
  window.addEventListener('hashchange', route);
  route();
  </script>
</body>
</html>
`;

writeFileSync(OUT, html);
console.log(`Wrote ${methods.length} methods / ${stageTotal} stages -> ${OUT}`);
