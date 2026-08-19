(function(){
 var header=document.getElementById("siteHeader");
 var toggle=document.getElementById("navToggle");
 var nav=document.getElementById("siteNav");
 var clock=document.getElementById("termClock");
 function onScroll(){
  if(!header)return;
  if(window.scrollY>10)header.classList.add("is-solid");
  else header.classList.remove("is-solid");
 }
 window.addEventListener("scroll",onScroll,{passive:true});
 onScroll();
 if(toggle&&nav){
  toggle.addEventListener("click",function(){
   var open=document.body.classList.toggle("nav-open");
   toggle.setAttribute("aria-expanded",open?"true":"false");
  });
  nav.querySelectorAll("a").forEach(function(a){
   a.addEventListener("click",function(){
    document.body.classList.remove("nav-open");
    toggle.setAttribute("aria-expanded","false");
   });
  });
 }
 if(clock){
  var tick=function(){
   var d=new Date();
   clock.textContent=d.toISOString().slice(11,19)+" UTC";
  };
  tick();
  if(!window.matchMedia || !window.matchMedia("(prefers-reduced-motion: reduce)").matches){
   setInterval(tick,1000);
  }
 }
 if("IntersectionObserver" in window){
  var io=new IntersectionObserver(function(entries){
   entries.forEach(function(en){
    if(en.isIntersecting){en.target.classList.add("is-in");io.unobserve(en.target);}
   });
  },{threshold:0.12});
  document.querySelectorAll(".reveal,.game-card,.odds-row,.bonus-box,.beam-card").forEach(function(el){io.observe(el);});
 } else {
  document.querySelectorAll(".reveal,.game-card").forEach(function(el){el.classList.add("is-in");});
 }
})();
