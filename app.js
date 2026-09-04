(() => {
      "use strict";
      const STORAGE_KEY="study-flow-planner-v1";
      const WEEK=["일","월","화","수","목","금","토"];
      const MONTH_SYMBOLS=["❄","♡","✿","☂","♧","☀","⛱","☆","✎","♬","☕","✦"];
      const EVENT_LABEL={exam:"시험",assignment:"수행평가",schedule:"일정"};
      const PRIORITY_LABEL={low:"Low",medium:"Medium",high:"High"};
      const ACCENTS=["#5868E8","#5963D9","#8658C7","#388F73","#D77943","#D55D8E"];
      const BACKGROUNDS=[
        {id:"ocean",name:"창밖의 바다",icon:"〰",price:0,description:"햇살이 반짝이는 푸른 바다"},
        {id:"grassland",name:"드넓은 초원",icon:"♧",price:400,description:"바람이 흐르는 평온한 초원"},
        {id:"crystal",name:"크리스탈 산",icon:"◇",price:500,description:"수정 산맥이 빛나는 판타지 세계"},
        {id:"cliff",name:"절벽 위 하늘",icon:"☁",price:600,description:"절벽 사이로 열린 맑은 하늘"},
        {id:"space",name:"보라빛 우주",icon:"✦",price:800,description:"블랙홀과 별이 흐르는 우주"},
        {id:"library",name:"마법 도서관",icon:"▤",price:700,description:"달빛과 책 향기가 머무는 서재"},
        {id:"cafe",name:"디저트 카페",icon:"♨",price:650,description:"달콤한 파스텔빛 휴식 공간"},
        {id:"aquarium",name:"심해 수족관",icon:"◌",price:750,description:"해파리 빛이 번지는 바닷속 전망대"},
        {id:"neon",name:"네온 빗속 도시",icon:"⌁",price:900,description:"비에 젖은 꿈결 같은 미래 도시"},
        {id:"clockwork",name:"별빛 시계공방",icon:"◷",price:1000,description:"별과 톱니바퀴가 움직이는 작업실"}
      ];
      const DEFAULT_SUBJECTS=[
        ["korean","국어","#ef8b8b"],["english","영어","#72a7e8"],["math","수학","#9585e6"],["science","과학","#70bd98"],
        ["social","사회","#e9a66f"],["history","역사","#ae8b78"],["info","정보","#67bdc8"],["music","음악","#e99dbe"],
        ["art","미술","#e4bf63"],["pe","체육","#9fca69"],["tech","기술·가정","#8098cc"],["other","기타","#9fa5b2"]
      ].map(([id,name,color])=>({id,name,color}));
      const INITIAL={
        accent:"#5868E8",background:"ocean",glassOpacity:80,tokens:0,ownedBackgrounds:["ocean"],dailyReward:{date:"",todoIds:[]},subjects:DEFAULT_SUBJECTS,events:[],todos:[]
      };

      let data=loadData();
      let page="calendar";
      let year=new Date().getFullYear();
      let mobileMonth=new Date().getMonth();
      let selectedDate=null;
      let selectedEventId=null;
      let addingEvent=false;
      let eventType="exam";
      let todoPriority="medium";
      let todoFilter="all";
      let todoSubjectFilter="";
      let toastTimer;

      function clone(value){return JSON.parse(JSON.stringify(value))}
      function loadData(){
        try{
          const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||"null");
          if(!saved)return clone(INITIAL);
          const savedOpacity=Number(saved.glassOpacity);
          const background=BACKGROUNDS.some(item=>item.id===saved.background)?saved.background:INITIAL.background;
          const owned=["ocean",...(Array.isArray(saved.ownedBackgrounds)?saved.ownedBackgrounds:[]),background].filter((id,index,array)=>BACKGROUNDS.some(item=>item.id===id)&&array.indexOf(id)===index);
          return {
            accent:saved.accent||INITIAL.accent,background,glassOpacity:Number.isFinite(savedOpacity)?Math.min(100,Math.max(10,savedOpacity)):INITIAL.glassOpacity,
            tokens:Math.max(0,Math.floor(Number(saved.tokens)||0)),ownedBackgrounds:owned,
            dailyReward:saved.dailyReward&&Array.isArray(saved.dailyReward.todoIds)?{date:String(saved.dailyReward.date||""),todoIds:[...new Set(saved.dailyReward.todoIds.map(String))].slice(0,10)}:clone(INITIAL.dailyReward),
            subjects:Array.isArray(saved.subjects)&&saved.subjects.length?saved.subjects:clone(DEFAULT_SUBJECTS),
            events:Array.isArray(saved.events)?saved.events.filter(item=>!String(item.id||"").startsWith("seed-")):[],
            todos:Array.isArray(saved.todos)?saved.todos.filter(item=>!String(item.id||"").startsWith("seed-")):[]
          };
        }catch{return clone(INITIAL)}
      }
      function save(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(data))}catch{}}
      function uid(prefix){return prefix+"_"+Date.now()+"_"+Math.random().toString(36).slice(2,7)}
      function esc(value=""){return String(value).replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]))}
      function keyOf(date){return date.getFullYear()+"-"+String(date.getMonth()+1).padStart(2,"0")+"-"+String(date.getDate()).padStart(2,"0")}
      function fromKey(key){const [y,m,d]=key.split("-").map(Number);return new Date(y,m-1,d)}
      function readable(key){return new Intl.DateTimeFormat("ko-KR",{year:"numeric",month:"long",day:"numeric",weekday:"long"}).format(fromKey(key))}
      function soft(hex){return hex+"1b"}
      function colorOf(subject){return data.subjects.find(item=>item.name===subject)?.color||"#8c94a4"}
      function contrast(hex){const value=hex.replace("#","");const r=parseInt(value.slice(0,2),16),g=parseInt(value.slice(2,4),16),b=parseInt(value.slice(4,6),16);return (r*299+g*587+b*114)/1000>160?"#202431":"#fff"}
      function applyAccent(){
        document.documentElement.style.setProperty("--accent",data.accent);
        document.documentElement.style.setProperty("--accent-soft",soft(data.accent));
        document.documentElement.style.setProperty("--accent-text",contrast(data.accent));
        document.querySelector('meta[name="theme-color"]').content=data.accent;
      }
      function applyBackground(){document.body.dataset.background=data.background||INITIAL.background}
      function applyGlass(){document.documentElement.style.setProperty("--glass-opacity",(data.glassOpacity/100).toFixed(2))}
      function refreshDailyReward(){
        const today=keyOf(new Date());
        if(data.dailyReward.date!==today){data.dailyReward={date:today,todoIds:[]};save()}
        return data.dailyReward;
      }
      function showToast(message){const el=document.querySelector("#toast");el.textContent=message;el.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("show"),1700)}

      function holidaysFor(targetYear){
        const map=new Map();
        const add=(date,name)=>{if(date.getFullYear()!==targetYear)return;const key=keyOf(date);map.set(key,[...(map.get(key)||[]),name])};
        [[1,1,"신정"],[3,1,"삼일절"],[5,1,"노동절"],[5,5,"어린이날"],[6,6,"현충일"],[7,17,"제헌절"],[8,15,"광복절"],[10,3,"개천절"],[10,9,"한글날"],[12,25,"성탄절"]].forEach(([m,d,name])=>{if(targetYear<2026&&(name==="노동절"||name==="제헌절"))return;add(new Date(targetYear,m-1,d),name)});
        const lunar=new Intl.DateTimeFormat("ko-KR-u-ca-dangi",{month:"numeric",day:"numeric"});
        for(let cursor=new Date(targetYear,0,1);cursor.getFullYear()===targetYear;cursor.setDate(cursor.getDate()+1)){
          const parts=lunar.formatToParts(cursor),m=Number(parts.find(p=>p.type==="month")?.value),d=Number(parts.find(p=>p.type==="day")?.value);
          if(m===1&&d===1){const before=new Date(cursor),after=new Date(cursor);before.setDate(before.getDate()-1);after.setDate(after.getDate()+1);add(before,"설날 연휴");add(new Date(cursor),"설날");add(after,"설날 연휴")}
          if(m===4&&d===8)add(new Date(cursor),"부처님오신날");
          if(m===8&&d===15){const before=new Date(cursor),after=new Date(cursor);before.setDate(before.getDate()-1);after.setDate(after.getDate()+1);add(before,"추석 연휴");add(new Date(cursor),"추석");add(after,"추석 연휴")}
        }
        [...map.entries()].forEach(([key,names])=>{
          if(names.some(name=>name.includes("연휴")||name==="설날"||name==="추석"))return;
          const date=fromKey(key),weekend=date.getDay()===0||date.getDay()===6;
          if(!weekend&&names.length<2)return;
          if(targetYear<2026&&["신정","현충일"].includes(names[0]))return;
          const substitute=new Date(date);do{substitute.setDate(substitute.getDate()+1)}while([0,6].includes(substitute.getDay())||map.has(keyOf(substitute)));add(substitute,names[0]+" 대체공휴일");
        });
        [["설날 연휴","설날"],["추석 연휴","추석"]].forEach(group=>{
          const entries=[...map.entries()].filter(([,names])=>names.some(name=>group.includes(name)));
          if(!entries.some(([key])=>[0,6].includes(fromKey(key).getDay())))return;
          const last=fromKey(entries.sort(([a],[b])=>a.localeCompare(b)).at(-1)[0]),substitute=new Date(last);
          do{substitute.setDate(substitute.getDate()+1)}while([0,6].includes(substitute.getDay())||map.has(keyOf(substitute)));add(substitute,group[1]+" 대체공휴일");
        });
        return map;
      }

      function renderNav(){
        document.querySelectorAll(".nav button").forEach(button=>button.classList.toggle("active",button.dataset.page===page));
        document.querySelectorAll(".view").forEach(view=>view.classList.toggle("active",view.id===page+"-view"));
      }
      function renderCalendar(){
        const holidayMap=holidaysFor(year),today=keyOf(new Date());
        document.querySelector("#year-input").value=year;
        document.querySelector("#mobile-month-label").textContent=(mobileMonth+1)+"월";
        const yearEvents=data.events.filter(event=>event.date.startsWith(year+"-"));
        const examCount=yearEvents.filter(event=>event.type==="exam").length;
        const assignmentCount=yearEvents.filter(event=>event.type==="assignment").length;
        const todayTodo=data.todos.filter(todo=>todo.dueDate===today&&!todo.completed).length;
        document.querySelector("#summary").innerHTML=
          '<div class="summary-card"><span class="summary-icon exam">●</span><div><b>'+examCount+'</b><small>올해 시험</small></div></div>'+
          '<div class="summary-card"><span class="summary-icon assignment">◆</span><div><b>'+assignmentCount+'</b><small>수행평가</small></div></div>'+
          '<div class="summary-card"><span class="summary-icon todo">✓</span><div><b>'+todayTodo+'</b><small>오늘 할 일</small></div></div>'+
          '<button class="primary" data-action="add-global">＋ 일정 추가</button>';
        document.querySelector("#months").innerHTML=Array.from({length:12},(_,month)=>{
          const first=new Date(year,month,1).getDay(),days=new Date(year,month+1,0).getDate(),total=Math.ceil((first+days)/7)*7;
          const cells=Array.from({length:total},(_,index)=>index<first?null:index-first+1).map(day=>day&&day<=days?day:null);
          const daysHtml=cells.map((day,index)=>{
            if(!day)return '<div class="day blank"></div>';
            const key=year+"-"+String(month+1).padStart(2,"0")+"-"+String(day).padStart(2,"0"),events=data.events.filter(event=>event.date===key),todos=data.todos.filter(todo=>todo.dueDate===key&&!todo.completed),holiday=holidayMap.get(key);
            const pills=events.slice(0,2).map(event=>{const color=event.type==="schedule"?"#8c94a4":colorOf(event.subject);return '<button class="event-pill" data-action="open-event" data-id="'+esc(event.id)+'" style="background:'+soft(color)+';color:'+color+';border-left-color:'+color+'">'+esc(event.title)+'</button>'}).join("");
            return '<div class="day '+(holiday?"holiday ":"")+(selectedDate===key?"selected ":"")+(today===key?"today":"")+'" data-action="open-date" data-date="'+key+'" tabindex="0"><div class="day-top"><span class="number">'+day+'</span>'+(todos.length?'<span class="todo-badge">Todo '+todos.length+'</span>':"")+'</div>'+(holiday?'<span class="holiday-name">'+esc(holiday.join(" · "))+'</span>':"")+'<div class="event-pills">'+pills+(events.length>2?'<span class="more">+'+(events.length-2)+'</span>':"")+'</div></div>';
          }).join("");
          return '<article class="month-card '+(month===mobileMonth?"mobile-active":"")+'"><div class="month-title"><h2><i class="month-symbol">'+MONTH_SYMBOLS[month]+'</i>'+(month+1)+'월</h2><span>'+year+'</span></div><div class="week">'+WEEK.map(day=>"<span>"+day+"</span>").join("")+'</div><div class="days">'+daysHtml+'</div></article>';
        }).join("");
      }
      function renderTodoOptions(){
        const options='<option value="">과목 없음</option>'+data.subjects.map(subject=>'<option value="'+esc(subject.name)+'">'+esc(subject.name)+'</option>').join("");
        document.querySelector("#todo-subject").innerHTML=options;
        document.querySelector("#subject-filter").innerHTML='<option value="">과목 선택</option>'+data.subjects.map(subject=>'<option value="'+esc(subject.name)+'">'+esc(subject.name)+'</option>').join("");
        document.querySelector("#subject-filter").value=todoSubjectFilter;
      }
      function filteredTodos(){
        const today=keyOf(new Date()),start=fromKey(today);start.setDate(start.getDate()-((start.getDay()+6)%7));const end=new Date(start);end.setDate(end.getDate()+6);
        return data.todos.filter(todo=>{
          if(todoFilter==="today")return todo.dueDate===today;
          if(todoFilter==="week")return todo.dueDate&&fromKey(todo.dueDate)>=start&&fromKey(todo.dueDate)<=end;
          if(todoFilter==="open")return !todo.completed;
          if(todoFilter==="done")return todo.completed;
          if(todoFilter==="subject")return todo.subject===todoSubjectFilter;
          return true;
        }).sort((a,b)=>Number(a.completed)-Number(b.completed)||({high:0,medium:1,low:2}[a.priority]-{high:0,medium:1,low:2}[b.priority]));
      }
      function renderTodos(){
        document.querySelector("#open-count").textContent=data.todos.filter(todo=>!todo.completed).length;
        const filterNames={all:"전체",today:"오늘",week:"이번 주",open:"미완료",done:"완료",subject:"과목별"};
        document.querySelector("#todo-filters").innerHTML=Object.entries(filterNames).map(([key,label])=>'<button class="'+(todoFilter===key?"active":"")+'" data-action="todo-filter" data-value="'+key+'">'+label+'</button>').join("");
        const subjectFilter=document.querySelector("#subject-filter");subjectFilter.classList.toggle("hidden",todoFilter!=="subject");
        const list=filteredTodos();
        document.querySelector("#todo-list").innerHTML=list.length?list.map(todo=>{
          const color=colorOf(todo.subject),due=todo.dueDate?new Intl.DateTimeFormat("ko-KR",{month:"long",day:"numeric"}).format(fromKey(todo.dueDate)):"";
          return '<article class="todo-item '+(todo.priority==="high"?"high ":"")+(todo.completed?"done":"")+'"><button class="check" style="--subject-color:'+color+'" data-action="toggle-todo" data-id="'+esc(todo.id)+'" aria-label="완료 상태 변경">'+(todo.completed?"✓":"")+'</button><div><div class="todo-title"><h3>'+esc(todo.title)+'</h3><span class="priority '+todo.priority+'">'+PRIORITY_LABEL[todo.priority]+'</span></div><div class="todo-meta">'+(todo.subject?'<span><i class="dot" style="background:'+color+'"></i>'+esc(todo.subject)+'</span>':"")+(due?'<span>◷ '+esc(due)+'</span>':"")+'</div>'+(todo.note?'<p class="todo-note">'+esc(todo.note)+'</p>':"")+'</div><button class="delete" data-action="delete-todo" data-id="'+esc(todo.id)+'" aria-label="할 일 삭제">×</button></article>';
        }).join(""):'<div class="empty-state"><div><b>표시할 할 일이 없어요</b><p>새 할 일을 추가하거나 다른 필터를 선택해 보세요.</p></div></div>';
      }
      function renderWallet(){
        const reward=refreshDailyReward(),count=reward.todoIds.length;
        ["token-balance","market-token-balance"].forEach(id=>{const el=document.querySelector("#"+id);if(el)el.textContent=data.tokens.toLocaleString("ko-KR")});
        const marketProgress=document.querySelector("#market-daily-progress");if(marketProgress)marketProgress.textContent=count+" / 10 완료";
        const questCount=document.querySelector("#quest-reward-count");if(questCount)questCount.textContent=count+" / 10";
      }
      function renderMarket(){
        document.querySelector("#market-grid").innerHTML=BACKGROUNDS.map(item=>{
          const owned=data.ownedBackgrounds.includes(item.id),active=data.background===item.id,affordable=data.tokens>=item.price;
          const buttonText=active?"✓ 사용 중":owned?"배경 적용":"✦ "+item.price.toLocaleString("ko-KR")+" 구매";
          return '<article class="market-card card '+(active?"active":"")+'"><div class="market-image"><picture><source media="(max-width:700px)" srcset="assets/backgrounds/'+item.id+'-mobile.png"><img src="assets/backgrounds/'+item.id+'-desktop.png" alt="'+esc(item.name)+' 배경 미리보기" loading="lazy"></picture><span class="ownership '+(owned?"owned":"locked")+'">'+(owned?"소장 중":"LOCKED")+'</span></div><div class="market-card-body"><div class="market-title"><span>'+item.icon+'</span><div><h2>'+esc(item.name)+'</h2><p>'+esc(item.description)+'</p></div></div><button class="market-buy '+(owned?"owned ":"")+(affordable?"":"poor")+'" data-action="market-background" data-value="'+item.id+'" '+(active?"disabled":"")+'>'+buttonText+'</button></div></article>';
        }).join("");
      }
      function renderQuests(){renderWallet()}
      function renderSettings(){
        document.querySelector("#accent-list").innerHTML=ACCENTS.map(color=>'<button class="'+(data.accent.toUpperCase()===color?"selected":"")+'" style="background:'+color+'" data-action="accent" data-value="'+color+'" aria-label="'+color+' 선택">'+(data.accent.toUpperCase()===color?"✓":"")+'</button>').join("");
        document.querySelector("#custom-accent").value=data.accent;
        document.querySelector("#glass-opacity").value=data.glassOpacity;
        document.querySelector("#glass-opacity-value").textContent=Math.round(data.glassOpacity)+"%";
        document.querySelector("#subject-list").innerHTML=data.subjects.map(subject=>'<div class="subject-row"><input type="color" value="'+subject.color+'" data-subject-color="'+esc(subject.id)+'" aria-label="'+esc(subject.name)+' 색상"><span>'+esc(subject.name)+'</span><button data-action="delete-subject" data-id="'+esc(subject.id)+'" aria-label="'+esc(subject.name)+' 삭제">×</button></div>').join("");
        document.querySelector("#background-list").innerHTML=BACKGROUNDS.map(item=>{const owned=data.ownedBackgrounds.includes(item.id);return '<button class="background-option '+(data.background===item.id?"selected ":"")+(owned?"":"locked")+'" data-action="'+(owned?"background":"open-market")+'" data-value="'+item.id+'" aria-pressed="'+(data.background===item.id)+'"><img src="assets/backgrounds/'+item.id+'-desktop.png" alt="" loading="lazy"><span><i>'+item.icon+'</i><b>'+item.name+'</b><em>'+(owned?"":"🔒")+'</em></span></button>'}).join("");
      }
      function renderAll(){applyAccent();applyBackground();applyGlass();renderNav();renderCalendar();renderTodoOptions();renderTodos();renderWallet();renderMarket();renderQuests();renderSettings()}

      function openDate(key){selectedDate=key;selectedEventId=null;addingEvent=false;renderCalendar();renderPanel()}
      function openEvent(id){const item=data.events.find(event=>event.id===id);if(!item)return;selectedDate=item.date;selectedEventId=id;addingEvent=false;renderCalendar();renderPanel()}
      function closePanel(){selectedDate=null;selectedEventId=null;addingEvent=false;document.querySelector("#modal-layer").classList.add("hidden");renderCalendar()}
      function renderPanel(){
        if(!selectedDate){document.querySelector("#modal-layer").classList.add("hidden");return}
        const layer=document.querySelector("#modal-layer"),body=document.querySelector("#panel-body"),holiday=holidaysFor(fromKey(selectedDate).getFullYear()).get(selectedDate)||[],events=data.events.filter(event=>event.date===selectedDate),selected=data.events.find(event=>event.id===selectedEventId);
        document.querySelector("#panel-title").textContent=readable(selectedDate);layer.classList.remove("hidden");
        const banners=holiday.map(name=>'<div class="holiday-banner">공휴일 · '+esc(name)+'</div>').join("");
        if(addingEvent){
          body.innerHTML=banners+'<button class="back" data-action="panel-overview">‹ 날짜 일정으로</button><h3>새 태그 추가</h3><form class="form" id="event-form"><label>종류<div class="segmented">'+["exam","assignment","schedule"].map(type=>'<button type="button" class="'+(eventType===type?"selected":"")+'" data-action="event-type" data-value="'+type+'">'+EVENT_LABEL[type]+'</button>').join("")+'</div></label>'+(eventType==="schedule"?'<label>일정 제목<input name="title" required autofocus placeholder="예: 동아리 모임"></label>':'<label>과목<select name="subject" required>'+data.subjects.map(subject=>'<option value="'+esc(subject.name)+'">'+esc(subject.name)+'</option>').join("")+'</select></label>')+'<p class="shortcut">Ctrl + Enter로 빠르게 추가할 수 있어요.</p><button class="primary full" type="submit">태그 추가</button></form>';
          return;
        }
        if(selected){
          const color=selected.type==="schedule"?"#8c94a4":colorOf(selected.subject),todoLinked=data.todos.some(todo=>todo.relatedEventId===selected.id);
          const fields=selected.type==="schedule"?'<label><span><b>일정 메모</b><small>시간, 장소, 준비물을 적어 두세요.</small></span><textarea rows="6" data-event-field="note">'+esc(selected.note||"")+'</textarea></label>':
            '<label><span><b>① 시험범위</b><small>어디까지 공부해야 하나요?</small></span><textarea rows="4" data-event-field="examRange">'+esc(selected.examRange||"")+'</textarea></label><label><span><b>② 출제 내용</b><small>예상 문제와 핵심 내용을 정리하세요.</small></span><textarea rows="4" data-event-field="content">'+esc(selected.content||"")+'</textarea></label><label><span><b>③ 기타</b><small>마지막으로 확인할 내용을 적어 두세요.</small></span><textarea rows="4" data-event-field="note">'+esc(selected.note||"")+'</textarea></label>';
          body.innerHTML=banners+'<button class="back" data-action="panel-overview">‹ 날짜 일정으로</button><div class="detail-title"><i style="background:'+color+'"></i><span><small>'+EVENT_LABEL[selected.type]+'</small><b>'+esc(selected.title)+'</b></span></div><div class="memo-fields">'+fields+'</div><div class="auto-save">✓ 입력 내용은 자동 저장됩니다.</div>'+(selected.type!=="schedule"?'<button class="related" data-action="related-todo" '+(todoLinked?"disabled":"")+'>'+(todoLinked?"✓ 시험 공부 Todo가 연결됨":"＋ 시험 공부 Todo 만들기")+'</button>':"")+'<button class="danger" data-action="delete-event">태그 삭제</button>';
          return;
        }
        body.innerHTML=banners+'<h3>등록된 일정 · '+events.length+'</h3>'+(events.length?'<div class="panel-events">'+events.map(event=>{const color=event.type==="schedule"?"#8c94a4":colorOf(event.subject);return '<button class="panel-event" data-action="open-event" data-id="'+esc(event.id)+'"><i style="background:'+color+'"></i><span><small>'+EVENT_LABEL[event.type]+'</small><b>'+esc(event.title)+'</b></span><em>›</em></button>'}).join("")+'</div>':'<div class="panel-empty">아직 등록된 일정이 없어요.</div>')+'<button class="primary full" data-action="add-event">＋ 태그 추가</button>';
      }

      document.addEventListener("click",event=>{
        const target=event.target.closest("[data-action]");if(!target)return;
        const action=target.dataset.action;
        if(action==="page"){page=target.dataset.page;renderNav();renderWallet();if(page==="todo")renderTodos();if(page==="market")renderMarket();if(page==="quests")renderQuests();if(page==="settings")renderSettings();window.scrollTo({top:0,behavior:"smooth"})}
        if(action==="today"){page="calendar";year=new Date().getFullYear();mobileMonth=new Date().getMonth();renderAll();openDate(keyOf(new Date()))}
        if(action==="year-prev"){year--;renderCalendar()} if(action==="year-next"){year++;renderCalendar()}
        if(action==="month-prev"){if(mobileMonth===0){mobileMonth=11;year--}else mobileMonth--;renderCalendar()}
        if(action==="month-next"){if(mobileMonth===11){mobileMonth=0;year++}else mobileMonth++;renderCalendar()}
        if(action==="open-date"){openDate(target.dataset.date)}
        if(action==="open-event"){event.stopPropagation();openEvent(target.dataset.id)}
        if(action==="add-global"){openDate(keyOf(new Date()));addingEvent=true;renderPanel()}
        if(action==="close-panel")closePanel()
        if(action==="panel-overview"){selectedEventId=null;addingEvent=false;renderPanel()}
        if(action==="add-event"){addingEvent=true;eventType="exam";renderPanel()}
        if(action==="event-type"){eventType=target.dataset.value;renderPanel()}
        if(action==="delete-event"&&selectedEventId&&confirm("이 태그를 삭제할까요?")){data.events=data.events.filter(item=>item.id!==selectedEventId);data.todos=data.todos.filter(todo=>todo.relatedEventId!==selectedEventId);selectedEventId=null;save();renderAll();renderPanel();showToast("태그를 삭제했어요.")}
        if(action==="related-todo"){
          const item=data.events.find(event=>event.id===selectedEventId);if(!item||data.todos.some(todo=>todo.relatedEventId===item.id))return;
          const due=fromKey(item.date);due.setDate(due.getDate()-1);data.todos.unshift({id:uid("todo"),title:item.title+" 공부",completed:false,subject:item.subject,dueDate:keyOf(due),priority:"high",note:"",relatedEventId:item.id});save();renderAll();renderPanel();showToast("시험 공부 Todo를 만들었어요.")
        }
        if(action==="priority"){todoPriority=target.dataset.value;document.querySelectorAll("#priority-picker button").forEach(button=>button.classList.toggle("selected",button.dataset.value===todoPriority))}
        if(action==="todo-filter"){todoFilter=target.dataset.value;renderTodos()}
        if(action==="toggle-todo"){
          const todo=data.todos.find(item=>item.id===target.dataset.id);if(!todo)return;
          const completing=!todo.completed;todo.completed=!todo.completed;
          let rewardMessage="";
          if(completing){
            const reward=refreshDailyReward();
            if(!reward.todoIds.includes(todo.id)&&reward.todoIds.length<10){reward.todoIds.push(todo.id);data.tokens+=100;rewardMessage="Todo 완료! 100 토큰을 받았어요. ✦"}
            else if(!reward.todoIds.includes(todo.id)&&reward.todoIds.length>=10)rewardMessage="오늘 받을 수 있는 10회 보상을 모두 받았어요.";
          }
          save();renderAll();if(rewardMessage)showToast(rewardMessage);
        }
        if(action==="delete-todo"&&confirm("이 할 일을 삭제할까요?")){data.todos=data.todos.filter(todo=>todo.id!==target.dataset.id);save();renderAll()}
        if(action==="accent"){data.accent=target.dataset.value;save();renderAll()}
        if(action==="background"){
          if(!data.ownedBackgrounds.includes(target.dataset.value)){page="market";renderNav();renderMarket();return showToast("마켓에서 먼저 배경을 구매해 주세요.")}
          data.background=target.dataset.value;save();applyBackground();renderSettings();renderMarket();showToast("배경을 바꿨어요.");
        }
        if(action==="open-market"){page="market";renderNav();renderMarket();window.scrollTo({top:0,behavior:"smooth"});showToast("마켓에서 잠금 해제할 수 있어요.")}
        if(action==="market-background"){
          const item=BACKGROUNDS.find(background=>background.id===target.dataset.value);if(!item)return;
          if(data.ownedBackgrounds.includes(item.id)){data.background=item.id;save();applyBackground();renderAll();return showToast("새 배경을 적용했어요.")}
          if(data.tokens<item.price)return showToast("토큰이 "+(item.price-data.tokens).toLocaleString("ko-KR")+"개 더 필요해요.");
          data.tokens-=item.price;data.ownedBackgrounds.push(item.id);data.background=item.id;save();applyBackground();renderAll();showToast(item.name+" 배경을 구매했어요! ✦");
        }
        if(action==="delete-subject"){
          if(data.subjects.length<=1)return showToast("과목은 하나 이상 필요해요.");
          if(confirm("이 과목을 목록에서 삭제할까요? 기존 일정은 유지됩니다.")){data.subjects=data.subjects.filter(subject=>subject.id!==target.dataset.id);save();renderAll()}
        }
      });

      document.addEventListener("submit",event=>{
        event.preventDefault();
        if(event.target.id==="todo-form"){
          const form=new FormData(event.target),title=String(form.get("title")||"").trim();if(!title)return;
          data.todos.unshift({id:uid("todo"),title,completed:false,subject:String(form.get("subject")||"")||undefined,dueDate:String(form.get("dueDate")||"")||undefined,priority:todoPriority,note:String(form.get("note")||"").trim()});event.target.reset();todoPriority="medium";save();renderAll();showToast("할 일을 추가했어요.");
        }
        if(event.target.id==="subject-form"){
          const form=new FormData(event.target),name=String(form.get("subjectName")||"").trim();if(!name||data.subjects.some(subject=>subject.name===name))return;
          data.subjects.push({id:uid("subject"),name,color:"#7f91c8"});event.target.reset();save();renderAll();showToast("과목을 추가했어요.");
        }
        if(event.target.id==="event-form"){
          const form=new FormData(event.target),subject=String(form.get("subject")||""),customTitle=String(form.get("title")||"").trim();if(eventType==="schedule"&&!customTitle)return;if(eventType!=="schedule"&&!subject)return;
          const item={id:uid("event"),date:selectedDate,type:eventType,subject:eventType==="schedule"?undefined:subject,title:eventType==="schedule"?customTitle:subject+" "+EVENT_LABEL[eventType],note:""};data.events.push(item);selectedEventId=item.id;addingEvent=false;save();renderAll();renderPanel();showToast("태그를 추가했어요.");
        }
      });

      document.addEventListener("input",event=>{
        if(event.target.id==="year-input"){const value=Number(event.target.value);if(value>=1900&&value<=2100){year=value;renderCalendar()}}
        if(event.target.id==="glass-opacity"){data.glassOpacity=Number(event.target.value);applyGlass();document.querySelector("#glass-opacity-value").textContent=data.glassOpacity+"%";save()}
        if(event.target.matches("[data-event-field]")&&selectedEventId){const item=data.events.find(event=>event.id===selectedEventId);if(item){item[event.target.dataset.eventField]=event.target.value;save()}}
      });
      document.addEventListener("change",event=>{
        if(event.target.id==="subject-filter"){todoSubjectFilter=event.target.value;renderTodos()}
        if(event.target.id==="custom-accent"){data.accent=event.target.value.toUpperCase();save();renderAll()}
        if(event.target.matches("[data-subject-color]")){const subject=data.subjects.find(item=>item.id===event.target.dataset.subjectColor);if(subject){subject.color=event.target.value;save();renderAll()}}
      });
      document.addEventListener("keydown",event=>{
        if(event.key==="Escape"&&selectedDate)closePanel();
        if((event.key==="Enter"||event.key===" ")&&event.target.matches(".day")){event.preventDefault();openDate(event.target.dataset.date)}
        if(event.ctrlKey&&event.key==="Enter"&&event.target.closest("#event-form"))event.target.closest("#event-form").requestSubmit();
      });
      const finePointer=window.matchMedia("(hover: hover) and (pointer: fine)");
      document.addEventListener("pointermove",event=>{
        const card=event.target.closest(".month-card");if(!card||!finePointer.matches)return;
        const rect=card.getBoundingClientRect(),offsetX=(event.clientX-rect.left)/rect.width-.5,offsetY=(event.clientY-rect.top)/rect.height-.5;
        card.classList.add("tilt-active");
        card.style.setProperty("--tilt-rx",(-offsetY*10).toFixed(2)+"deg");
        card.style.setProperty("--tilt-ry",(offsetX*10).toFixed(2)+"deg");
        card.style.setProperty("--shine-x",((offsetX+.5)*100).toFixed(1)+"%");
        card.style.setProperty("--shine-y",((offsetY+.5)*100).toFixed(1)+"%");
      });
      document.addEventListener("pointerout",event=>{
        const card=event.target.closest(".month-card");if(!card||card.contains(event.relatedTarget))return;
        card.classList.remove("tilt-active");
        card.style.setProperty("--tilt-rx","0deg");card.style.setProperty("--tilt-ry","0deg");card.style.setProperty("--shine-x","50%");card.style.setProperty("--shine-y","50%");
      });
      document.querySelector("#modal-layer").addEventListener("mousedown",event=>{if(event.target===event.currentTarget)closePanel()});
      applyAccent();applyBackground();applyGlass();renderAll();
    })();
