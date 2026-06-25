
    /* Apply saved theme before first paint to avoid a flash. */
    (function () {
      try {
        var raw = localStorage.getItem("halo.theme");
        var t = raw ? JSON.parse(raw) : "light";
        var dark = t === "dark" ||
          (t === "auto" && window.matchMedia &&
           window.matchMedia("(prefers-color-scheme: dark)").matches);
        document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
      } catch (e) {}
    })();
  