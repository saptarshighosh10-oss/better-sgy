
/* Apply persisted theme before first paint to avoid a flash. */
(function(){
  try{
    var s = JSON.parse(localStorage.getItem("bsgy_apple_mock_v1") || "{}");
    var app = s.appearance || "light";
    var dark = app==="dark" || (app==="auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  }catch(e){}
})();
