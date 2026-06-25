
/* Better SGY — Discord webhook bridge: posts the webhook to the parent React
   shell (which saves it for real) and refills the field on settings re-render. */
(function(){
  var current = '';
  window.addEventListener('message', function(e){
    var d = e && e.data;
    if (d && typeof d.bsgyDiscordInit === 'string'){
      current = d.bsgyDiscordInit;
      var i = document.getElementById('bsgyDiscord');
      if (i) i.value = current;
    }
  });
  document.addEventListener('input', function(e){
    var t = e.target;
    if (t && t.id === 'bsgyDiscord'){
      current = (t.value || '').trim();
      try { parent.postMessage({ bsgyDiscord: current }, '*'); } catch(_){}
    }
  }, true);
  try {
    var mo = new MutationObserver(function(){
      var i = document.getElementById('bsgyDiscord');
      if (i && i.value === '' && current) i.value = current;
    });
    mo.observe(document.documentElement, { childList:true, subtree:true });
  } catch(_){}
  try { parent.postMessage({ bsgyDiscordReady: 1 }, '*'); } catch(_){}
})();
