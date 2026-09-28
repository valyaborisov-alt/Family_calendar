
(function(){
  "use strict";
  var STORE="family-calendar-events-v4";
  var VIEW_STORE="family-calendar-view-v1";
  var view=localStorage.getItem(VIEW_STORE)||"week";
  var cursor=new Date();
  var selectedId=null;
  var filters={me:true,wife:true,kids:true,family:true};

  function qs(s){return document.querySelector(s)}
  function qsa(s){return Array.prototype.slice.call(document.querySelectorAll(s))}
  function pad(n){return String(n).padStart(2,"0")}
  function cloneDate(d){return new Date(d.getTime())}
  function startDay(d){var x=cloneDate(d);x.setHours(0,0,0,0);return x}
  function endDay(d){var x=cloneDate(d);x.setHours(23,59,59,999);return x}
  function startWeek(d){var x=startDay(d),shift=(x.getDay()+6)%7;x.setDate(x.getDate()-shift);return x}
  function endWeek(d){var x=startWeek(d);x.setDate(x.getDate()+6);return endDay(x)}
  function startMonth(d){return new Date(d.getFullYear(),d.getMonth(),1)}
  function endMonth(d){return new Date(d.getFullYear(),d.getMonth()+1,0,23,59,59,999)}
  function sameDay(a,b){return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate()}
  function fmt(d,o){return new Intl.DateTimeFormat("ru-RU",o).format(d)}
  function uid(){if(window.crypto&&window.crypto.randomUUID)return window.crypto.randomUUID();return "e-"+Date.now()+"-"+Math.random().toString(16).slice(2)}
  function inputValue(d){return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())+"T"+pad(d.getHours())+":"+pad(d.getMinutes())}
  function esc(s){return String(s||"").replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]})}
  function clean(s){return String(s||"").replace(/^(🏠|👨|👩|👧|👦)\s*/,"").trim()}
  function person(s){var m=String(s||"").match(/^(🏠|👨|👩|👧|👦)/);return m?m[1]:"🏠"}
  function cat(s){s=String(s||"");if(s.indexOf("👨")===0)return"me";if(s.indexOf("👩")===0)return"wife";if(s.indexOf("👧")===0||s.indexOf("👦")===0)return"kids";return"family"}
  function labelFor(c){return c==="me"?"Я":c==="wife"?"Жена":c==="kids"?"Дети":"Общее"}

  function seed(){
    var n=new Date();
    return [
      {id:uid(),summary:"🏠 Семейный ужин",description:"",location:"Дом",start:new Date(n.getFullYear(),n.getMonth(),n.getDate(),19,0).toISOString(),end:new Date(n.getFullYear(),n.getMonth(),n.getDate(),20,0).toISOString()},
      {id:uid(),summary:"👧 Танцы",description:"",location:"Студия",start:new Date(n.getFullYear(),n.getMonth(),n.getDate()+1,17,30).toISOString(),end:new Date(n.getFullYear(),n.getMonth(),n.getDate()+1,18,30).toISOString()},
      {id:uid(),summary:"👩 Врач",description:"",location:"",start:new Date(n.getFullYear(),n.getMonth(),n.getDate()+2,10,0).toISOString(),end:new Date(n.getFullYear(),n.getMonth(),n.getDate()+2,11,0).toISOString()},
      {id:uid(),summary:"👨 Тренировка",description:"",location:"",start:new Date(n.getFullYear(),n.getMonth(),n.getDate()+3,20,0).toISOString(),end:new Date(n.getFullYear(),n.getMonth(),n.getDate()+3,21,0).toISOString()}
    ]
  }
  function readAll(){
    try{var x=JSON.parse(localStorage.getItem(STORE)||"null");if(Array.isArray(x))return x}catch(e){}
    var data=seed();localStorage.setItem(STORE,JSON.stringify(data));return data
  }
  function writeAll(x){localStorage.setItem(STORE,JSON.stringify(x))}
  function getEvent(id){var a=readAll();for(var i=0;i<a.length;i++)if(a[i].id===id)return a[i];return null}
  function visibleEvent(e){return filters[cat(e.summary)]!==false}

  function range(){
    if(view==="today")return[startDay(cursor),endDay(cursor)];
    if(view==="month")return[startMonth(cursor),endMonth(cursor)];
    return[startWeek(cursor),endWeek(cursor)]
  }
  function eventsInRange(a,b){
    return readAll().filter(function(e){var d=new Date(e.start);return d>=a&&d<=b&&visibleEvent(e)}).sort(function(x,y){return new Date(x.start)-new Date(y.start)})
  }
  function title(){
    var r=range(),a=r[0],b=r[1];
    if(view==="today")return fmt(a,{weekday:"long",day:"numeric",month:"long",year:"numeric"});
    if(view==="month")return fmt(a,{month:"long",year:"numeric"});
    return fmt(a,{day:"numeric",month:"short"})+" — "+fmt(b,{day:"numeric",month:"short",year:"numeric"})
  }

  function renderMini(){
    var box=qs("#miniCalendar");box.innerHTML="";
    var names=["П","В","С","Ч","П","С","В"];
    names.forEach(function(n){var d=document.createElement("div");d.className="dow";d.textContent=n;box.appendChild(d)});
    var first=new Date(cursor.getFullYear(),cursor.getMonth(),1);
    var gridStart=startWeek(first);
    for(var i=0;i<42;i++){
      var d=new Date(gridStart.getFullYear(),gridStart.getMonth(),gridStart.getDate()+i);
      var b=document.createElement("button");b.type="button";b.className="mini-day";
      if(d.getMonth()!==cursor.getMonth())b.className+=" other";
      if(sameDay(d,new Date()))b.className+=" today";
      if(sameDay(d,cursor))b.className+=" selected";
      b.textContent=d.getDate();b.setAttribute("data-date",d.toISOString());
      b.addEventListener("click",function(){cursor=new Date(this.getAttribute("data-date"));view="today";saveView();render()});
      box.appendChild(b)
    }
  }

  function eventCard(e){
    var s=new Date(e.start),c=cat(e.summary);
    return '<button type="button" class="event-card '+c+'" data-event="'+esc(e.id)+'">'+
      '<div class="time">'+fmt(s,{hour:"2-digit",minute:"2-digit"})+'</div>'+
      '<div class="title">'+esc(clean(e.summary))+'</div>'+
      (e.location?'<div class="place">⌖ '+esc(e.location)+'</div>':'')+
      '</button>'
  }

  function bindCards(){
    qsa("[data-event]").forEach(function(el){el.addEventListener("click",function(){selectedId=this.getAttribute("data-event");renderDetail();})})
  }

  function renderWeek(){
    var a=startWeek(cursor),head='<div class="week-head">',body='<div class="week-grid">';
    for(var i=0;i<7;i++){
      var d=new Date(a.getFullYear(),a.getMonth(),a.getDate()+i);
      head+='<div class="week-day-head '+(sameDay(d,new Date())?'today':'')+'"><div class="name">'+fmt(d,{weekday:"short"})+'</div><div class="num">'+d.getDate()+'</div></div>'
    }
    head+='</div>';
    var all=eventsInRange(a,endWeek(cursor));
    for(var j=0;j<7;j++){
      var day=new Date(a.getFullYear(),a.getMonth(),a.getDate()+j);
      var items=all.filter(function(e){return sameDay(new Date(e.start),day)});
      body+='<div class="day-col" data-day="'+day.toISOString()+'">';
      body+=items.length?items.map(eventCard).join(""):'<div class="day-col-empty">Свободно</div>';
      body+='</div>'
    }
    body+='</div>';
    qs("#calendar").innerHTML=head+body;
    qsa(".day-col").forEach(function(col){col.addEventListener("dblclick",function(){openNew(new Date(this.getAttribute("data-day")))})});
    bindCards()
  }

  function renderToday(){
    var a=startDay(cursor),items=eventsInRange(a,endDay(cursor)),html='<div class="today-list">';
    if(!items.length)html='<div class="empty-state"><strong>На этот день ничего нет</strong><span>Добавьте событие кнопкой сверху.</span></div>';
    else{
      items.forEach(function(e){var s=new Date(e.start),en=new Date(e.end),c=cat(e.summary);html+='<button type="button" class="today-row '+c+'" data-event="'+esc(e.id)+'"><div class="time">'+fmt(s,{hour:"2-digit",minute:"2-digit"})+'<br>— '+fmt(en,{hour:"2-digit",minute:"2-digit"})+'</div><div><div class="title">'+person(e.summary)+' '+esc(clean(e.summary))+'</div><div class="meta">'+esc(e.location||e.description||"")+'</div></div><div class="chev">›</div></button>'});
      html+='</div>'
    }
    qs("#calendar").innerHTML=html;bindCards()
  }

  function renderMonth(){
    var first=startMonth(cursor),start=startWeek(first),html='<div class="month-grid">';
    ["ПН","ВТ","СР","ЧТ","ПТ","СБ","ВС"].forEach(function(x){html+='<div class="month-dow">'+x+'</div>'});
    var end=new Date(start.getFullYear(),start.getMonth(),start.getDate()+41,23,59,59,999);
    var all=eventsInRange(start,end);
    for(var i=0;i<42;i++){
      var d=new Date(start.getFullYear(),start.getMonth(),start.getDate()+i);
      var items=all.filter(function(e){return sameDay(new Date(e.start),d)});
      html+='<div class="month-cell '+(d.getMonth()!==cursor.getMonth()?'other':'')+'" data-month-day="'+d.toISOString()+'">';
      html+='<div class="month-num '+(sameDay(d,new Date())?'today':'')+'">'+d.getDate()+'</div>';
      items.slice(0,4).forEach(function(e){html+='<div class="month-event '+cat(e.summary)+'" data-event="'+esc(e.id)+'">'+fmt(new Date(e.start),{hour:"2-digit",minute:"2-digit"})+' '+esc(clean(e.summary))+'</div>'});
      if(items.length>4)html+='<div class="month-event">+'+(items.length-4)+' ещё</div>';
      html+='</div>'
    }
    html+='</div>';qs("#calendar").innerHTML=html;
    qsa("[data-month-day]").forEach(function(el){el.addEventListener("click",function(ev){if(ev.target.hasAttribute("data-event"))return;cursor=new Date(this.getAttribute("data-month-day"));view="today";saveView();render()})});
    bindCards()
  }

  function renderDetail(){
    var box=qs("#detail");
    if(!selectedId){box.innerHTML='<div class="detail-empty"><div class="big">📅</div><strong>Выберите событие</strong><div>Здесь появятся детали и быстрые действия.</div></div>';return}
    var e=getEvent(selectedId);if(!e){selectedId=null;renderDetail();return}
    var s=new Date(e.start),en=new Date(e.end),c=cat(e.summary);
    box.innerHTML='<span class="tag '+c+'">'+person(e.summary)+' '+labelFor(c)+'</span>'+
      '<h3>'+esc(clean(e.summary))+'</h3>'+
      '<div class="detail-line"><span class="ico">🕒</span><span>'+fmt(s,{weekday:"long",day:"numeric",month:"long"})+'<br>'+fmt(s,{hour:"2-digit",minute:"2-digit"})+' — '+fmt(en,{hour:"2-digit",minute:"2-digit"})+'</span></div>'+
      (e.location?'<div class="detail-line"><span class="ico">📍</span><span>'+esc(e.location)+'</span></div>':'')+
      (e.description?'<div class="detail-line"><span class="ico">📝</span><span>'+esc(e.description)+'</span></div>':'')+
      '<div class="detail-actions"><button type="button" id="editSelected" class="btn">Изменить</button><button type="button" id="deleteSelected" class="btn danger-text">Удалить</button></div>';
    qs("#editSelected").addEventListener("click",function(){openEdit(e)});
    qs("#deleteSelected").addEventListener("click",function(){deleteEvent(e.id)})
  }

  function render(){
    qs("#periodTitle").textContent=title();
    qsa("[data-view]").forEach(function(b){b.classList.toggle("active",b.getAttribute("data-view")===view)});
    renderMini();
    if(view==="today")renderToday();else if(view==="month")renderMonth();else renderWeek();
    renderDetail()
  }

  function openModal(){
    qs("#modalBackdrop").classList.add("open");
    document.body.style.overflow="hidden";
    setTimeout(function(){qs("#eventTitle").focus()},50)
  }
  function closeModal(){qs("#modalBackdrop").classList.remove("open");document.body.style.overflow=""}

  function openNew(baseDate){
    var d=baseDate?new Date(baseDate):new Date();
    if(baseDate){d.setHours(18,0,0,0)}else d.setMinutes(Math.ceil(d.getMinutes()/15)*15,0,0);
    var en=new Date(d.getTime()+60*60*1000);
    qs("#eventId").value="";
    qs("#modalMode").textContent="Новое событие";
    qs("#modalTitle").textContent="Добавить событие";
    qs("#deleteInModal").style.display="none";
    qs("#eventWho").value="🏠";
    qs("#eventTitle").value="";
    qs("#eventStart").value=inputValue(d);
    qs("#eventEnd").value=inputValue(en);
    qs("#eventLocation").value="";
    qs("#eventDescription").value="";
    openModal()
  }

  function openEdit(e){
    qs("#eventId").value=e.id;qs("#modalMode").textContent="Редактирование";qs("#modalTitle").textContent=clean(e.summary);qs("#deleteInModal").style.display="inline-flex";
    qs("#eventWho").value=person(e.summary);qs("#eventTitle").value=clean(e.summary);qs("#eventStart").value=inputValue(new Date(e.start));qs("#eventEnd").value=inputValue(new Date(e.end));qs("#eventLocation").value=e.location||"";qs("#eventDescription").value=e.description||"";openModal()
  }

  function toast(msg){var t=qs("#toast");t.textContent=msg;t.classList.add("show");setTimeout(function(){t.classList.remove("show")},1600)}

  function deleteEvent(id){
    if(!confirm("Удалить это событие?"))return;
    writeAll(readAll().filter(function(e){return e.id!==id}));
    if(selectedId===id)selectedId=null;
    closeModal();render();toast("Событие удалено")
  }

  function saveView(){localStorage.setItem(VIEW_STORE,view)}

  qs("#eventForm").addEventListener("submit",function(ev){
    ev.preventDefault();
    var id=qs("#eventId").value;
    var s=new Date(qs("#eventStart").value),en=new Date(qs("#eventEnd").value);
    if(!(s<en)){alert("Время окончания должно быть позже начала.");return}
    var item={id:id||uid(),summary:qs("#eventWho").value+" "+qs("#eventTitle").value.trim(),start:s.toISOString(),end:en.toISOString(),location:qs("#eventLocation").value.trim(),description:qs("#eventDescription").value.trim()};
    var all=readAll(),found=false;
    for(var i=0;i<all.length;i++){if(all[i].id===item.id){all[i]=item;found=true;break}}
    if(!found)all.push(item);
    writeAll(all);selectedId=item.id;closeModal();cursor=new Date(item.start);render();toast(id?"Событие обновлено":"Событие добавлено")
  });

  qs("#addBtn").addEventListener("click",function(){openNew(null)});
  qs("#modalClose").addEventListener("click",closeModal);
  qs("#cancelModal").addEventListener("click",closeModal);
  qs("#modalBackdrop").addEventListener("click",function(e){if(e.target===this)closeModal()});
  qs("#deleteInModal").addEventListener("click",function(){var id=qs("#eventId").value;if(id)deleteEvent(id)});
  qs("#prevBtn").addEventListener("click",function(){if(view==="today")cursor.setDate(cursor.getDate()-1);else if(view==="month")cursor.setMonth(cursor.getMonth()-1);else cursor.setDate(cursor.getDate()-7);render()});
  qs("#nextBtn").addEventListener("click",function(){if(view==="today")cursor.setDate(cursor.getDate()+1);else if(view==="month")cursor.setMonth(cursor.getMonth()+1);else cursor.setDate(cursor.getDate()+7);render()});
  qs("#todayBtn").addEventListener("click",function(){cursor=new Date();render()});
  qsa("[data-view]").forEach(function(b){b.addEventListener("click",function(){view=this.getAttribute("data-view");saveView();render()})});
  qsa("[data-filter]").forEach(function(cb){cb.addEventListener("change",function(){filters[this.getAttribute("data-filter")]=this.checked;render()})});
  document.addEventListener("keydown",function(e){if(e.key==="Escape")closeModal();if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="n"){e.preventDefault();openNew(null)}});

  if("serviceWorker" in navigator){navigator.serviceWorker.register("/sw.js").catch(function(){})}
  render()
})();
