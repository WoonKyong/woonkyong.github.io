import {DEFAULTS,calculate,loanCap} from './model.mjs';
const $=id=>document.getElementById(id);
const form=$('model-form');
const fmt=(v,n=2)=>Number(v).toLocaleString('ko-KR',{minimumFractionDigits:n,maximumFractionDigits:n});
const money=v=>Math.abs(v)>=1?`${fmt(Math.abs(v))}억원`:`${fmt(Math.abs(v)*10000,0)}만원`;
const svgStart=(label,w,h)=>`<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg"><title>${label}</title>`;
let current=Object.assign({},DEFAULTS);
let currentRows=[];

function historyChart(){
  const data=JSON.parse($('research-data').textContent).history;
  const names=[['자연앤힐스테이트','#196a58'],['광교중흥S클래스','#ba7539'],['자연앤자이3단지','#6488b4']];
  const w=780,h=302,left=38,right=32,top=20,bottom=34;
  const x=year=>left+(year-2017)/9*(w-left-right),y=price=>h-bottom-price/30*(h-top-bottom);
  let svg=svgStart('2017년부터 2026년까지 단지별 연평균 매매가격. 정확한 값과 표본 수는 본문 표 참고.',w,h);
  for(const p of [0,5,10,15,20,25,30])svg+=`<line x1="${left}" x2="${w-right}" y1="${y(p)}" y2="${y(p)}" stroke="#e6ebe3"/><text x="${left-10}" y="${y(p)+4}" text-anchor="end" font-size="10" fill="#829080">${p}</text>`;
  for(let year=2017;year<=2026;year++)svg+=`<text x="${x(year)}" y="${h-10}" text-anchor="middle" font-size="10" fill="#829080">${year===2026?'26*':String(year).slice(2)}</text>`;
  for(const [name,color] of names){
    const series=data.filter(r=>r[0]===name&&r[2]>=2017).sort((a,b)=>a[2]-b[2]);
    if(!series.length)continue;
    svg+=`<polyline points="${series.map(r=>`${x(r[2])},${y(r[3])}`).join(' ')}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`;
    for(const row of series)svg+=`<circle cx="${x(row[2])}" cy="${y(row[3])}" r="3.4" fill="${color}"><title>${name} ${row[2]}년 ${fmt(row[3])}억원 / ${row[4]}건</title></circle>`;
    const last=series.at(-1);svg+=`<text x="${x(last[2])-8}" y="${y(last[3])+(name==='자연앤힐스테이트'?18:-10)}" text-anchor="end" font-size="11" font-weight="650" fill="${color}">${fmt(last[3])}</text>`;
  }
  $('history-chart').innerHTML=svg+'</svg>';
}

function drawScenarios(rows,result){
  const w=780,h=255,left=58,right=26,top=25,bottom=37;
  const max=Math.max(1,...rows.map(r=>Math.abs(r.advantage)))*1.15;
  const zero=top+(h-top-bottom)/2,scale=(h-top-bottom)/2/max;
  const barW=57,step=(w-left-right)/rows.length;
  let svg=svgStart('각 집값 시나리오의 매수 전략별 순자산 차이. 위쪽 녹색은 지금 매수, 아래쪽 갈색은 전세 후 매수 우위이며 아래 표에 같은 수치가 있습니다.',w,h);
  for(const value of [-max,0,max]){const y=zero-value*scale;svg+=`<line x1="${left}" x2="${w-right}" y1="${y}" y2="${y}" stroke="${value===0?'#94a58f':'#e6ebe3'}" ${value===0?'':'stroke-dasharray="3 5"'}/>`;}
  svg+=`<text x="${left-10}" y="${top+4}" text-anchor="end" font-size="10" fill="#6c806e">지금</text><text x="${left-10}" y="${h-bottom}" text-anchor="end" font-size="10" fill="#9f754f">대기</text>`;
  rows.forEach((r,index)=>{const x=left+step*(index+.5),height=Math.max(1,Math.abs(r.advantage)*scale),isNow=r.advantage>0,y=isNow?zero-height:zero;
    svg+=`<rect x="${x-barW/2}" y="${y}" width="${barW}" height="${height}" rx="2" fill="${isNow?'#28745e':'#ba8457'}" opacity="${r.growth===current.growth?'1':'.75'}"><title>${r.growth}%: ${isNow?'지금 매수':'전세 후 매수'} ${money(r.advantage)} 우위</title></rect><text x="${x}" y="${isNow?y-8:y+height+16}" text-anchor="middle" font-size="11" fill="${isNow?'#196a58':'#98663b'}">${fmt(Math.abs(r.advantage))}억</text><text x="${x}" y="${h-9}" text-anchor="middle" font-size="11" fill="#71816f">${r.growth>0?'+':''}${r.growth}%</text>`;
  });
  $('scenario-chart').innerHTML=svg+'</svg>';
}

function render(){
  const p=Object.fromEntries(Object.keys(DEFAULTS).map(key=>[key,Number(form.elements.namedItem(key).value)]));
  $('growth-value').textContent=`${p.growth>0?'+':''}${p.growth}%`;
  try{
    if(!form.checkValidity())throw new Error('입력값이 비어 있거나 허용 범위를 벗어났습니다.');
    const m=calculate(p);current=p;
    const now=m.advantage>0.0000001,tie=Math.abs(m.advantage)<0.0000001;
    $('result-choice').textContent=tie?'두 전략의 순자산이 같습니다':now?'지금 매수 우위':'전세 후 매수 우위';
    const unit=Math.abs(m.advantage)>=1?'억원':'만원';
    $('result-amount').replaceChildren(document.createTextNode(fmt(Math.abs(m.advantage)*(unit==='만원'?10000:1),unit==='만원'?0:2)),Object.assign(document.createElement('span'),{textContent:unit}));
    $('result-detail').textContent=`${fmt(p.months,0)}개월 후 매매가 ${fmt(m.futurePrice)}억원 가정. 미래 상승률의 예측이 아닌 비용 비교입니다.`;
    $('break-even').textContent=`${fmt(m.breakEven*100)}%`;
    $('own-cash').textContent=`${fmt(m.K)}억`;
    $('monthly-payment').textContent=`${fmt(m.monthly*10000,0)}만원`;
    const warnings=[];
    if(p.loan>loanCap(p.price))warnings.push(`가정한 주담대 ${p.loan}억원이 현행 시가 구간 상한 ${loanCap(p.price)}억원을 넘습니다. 실제 대출 승인 확인이 필요합니다.`);
    if(m.released<0)warnings.push('전세보증금과 추가 비용이 비교의 출발 자기자금을 넘습니다. 이 모형에 포함되지 않은 추가 조달이 필요합니다.');
    if(m.futureLoan<p.loan)warnings.push(`현행 규정이 유지되면 이 미래 가격의 주담대 상한은 ${loanCap(m.futurePrice)}억원입니다. 그 한도를 적용한 미래 매수 필요 자기자금은 약 ${fmt(m.futureCash)}억원입니다. 전략 순자산 비교는 동일 대출 가정이므로 별도 자금계획이 필요합니다.`);
    $('model-warning').hidden=warnings.length===0;$('model-warning').textContent=warnings.join(' ');
    const growths=[-20,-10,0,10,20];if(!growths.includes(p.growth))growths.push(p.growth);growths.sort((a,b)=>a-b);
    currentRows=growths.map(growth=>({growth,...calculate({...p,growth})}));
    $('scenario-rows').replaceChildren(...currentRows.map(r=>{const tr=document.createElement('tr');for(const text of [`${r.growth>0?'+':''}${r.growth}%`,`${fmt(r.futurePrice)}억`,r.advantage>0?'지금 매수':'전세 후 매수',money(r.advantage)]){const td=document.createElement('td');td.textContent=text;tr.append(td);}return tr;}));
    drawScenarios(currentRows,m);$('download-csv').disabled=false;
  }catch(error){
    $('result-choice').textContent='입력값을 확인하세요';$('result-amount').textContent='—';$('result-detail').textContent=error.message;
    for(const id of ['break-even','own-cash','monthly-payment'])$(id).textContent='—';
    $('model-warning').hidden=true;$('scenario-rows').replaceChildren();$('scenario-chart').replaceChildren();$('download-csv').disabled=true;
  }
}

function applyPreset(preset){
  const values={...DEFAULTS,...(preset==='natural'?{deposit:9.75,taxRate:3.3}:{})};
  for(const [key,value]of Object.entries(values))form.elements.namedItem(key).value=value;
  document.querySelectorAll('[data-preset]').forEach(button=>{const active=button.dataset.preset===preset;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});render();
}
form.addEventListener('input',render);form.addEventListener('submit',event=>event.preventDefault());
document.querySelectorAll('[data-preset]').forEach(button=>button.addEventListener('click',()=>applyPreset(button.dataset.preset)));
$('reset-model').addEventListener('click',()=>applyPreset('summit'));
$('print-report').addEventListener('click',()=>window.print());
$('download-csv').addEventListener('click',()=>{
  const rows=[['광교 매수 시점 시나리오','자료 기준 2026-10-20'],['계산 가정','값'],...Object.entries(current),[],['집값 변화(%)','미래 매매가(억원)','지금 매수 상대 우위(억원)','손익분기 누적 상승률(%)'],...currentRows.map(r=>[r.growth,r.futurePrice.toFixed(6),r.advantage.toFixed(6),(r.breakEven*100).toFixed(6)])];
  const csv='\uFEFF'+rows.map(row=>row.map(value=>'"'+String(value).replaceAll('"','""')+'"').join(',')).join('\r\n');
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));const a=document.createElement('a');a.href=url;a.download='gwanggyo-scenarios.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
const sourceItems=[...document.querySelectorAll('.sources-list li')];
$('source-filter').addEventListener('input',event=>{const query=event.target.value.trim().toLocaleLowerCase('ko');let count=0;for(const item of sourceItems){const match=item.dataset.search.toLocaleLowerCase('ko').includes(query);item.hidden=!match;if(match)count++;}$('source-count').textContent=`${count}개 출처`;$('source-empty').hidden=count!==0;});
window.addEventListener('hashchange',()=>{if(location.hash.startsWith('#source-')){$('source-filter').value='';for(const item of sourceItems)item.hidden=false;$('source-count').textContent=`${sourceItems.length}개 출처`;$('source-empty').hidden=true;}});
const navLinks=[...document.querySelectorAll('.sidebar nav a')];
const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){navLinks.forEach(link=>link.classList.toggle('active',link.hash===`#${entry.target.id}`));}},{rootMargin:'-15% 0px -65% 0px',threshold:0});
document.querySelectorAll('.report-section[id^="section-"]').forEach(section=>observer.observe(section));
let ticking=false;window.addEventListener('scroll',()=>{if(!ticking){requestAnimationFrame(()=>{const max=document.documentElement.scrollHeight-window.innerHeight;$('reading-progress').style.width=`${max>0?window.scrollY/max*100:0}%`;ticking=false;});ticking=true;}},{passive:true});
historyChart();render();
