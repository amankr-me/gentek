/* ==========================================================================
   Gentek Lab — shared site behaviour
   Sticky header, back-to-top, mobile drawer, horizontal rails, lightbox.
   ========================================================================== */
(function () {
    "use strict";

    if (window.AOS) {
        AOS.init({ duration: 700, easing: "ease-out-cubic", once: true, offset: 60 });
    }

    /* ---- Sticky header shadow + back-to-top visibility ---- */
    var header = document.getElementById("siteHeader");
    var toTop = document.getElementById("toTop");

    function onScroll() {
        var y = window.pageYOffset;
        if (header) { header.classList.toggle("is-stuck", y > 8); }
        if (toTop) { toTop.classList.toggle("is-visible", y > 480); }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    if (toTop) {
        toTop.addEventListener("click", function () {
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
    }

    /* ---- Mobile drawer ---- */
    var drawer = document.getElementById("mobileDrawer");
    var scrim = document.querySelector(".scrim");
    var opener = document.querySelector("[data-drawer-open]");

    if (drawer && scrim && opener) {
        var setDrawer = function (open) {
            drawer.classList.toggle("is-open", open);
            scrim.classList.toggle("is-open", open);
            opener.setAttribute("aria-expanded", String(open));
            document.body.style.overflow = open ? "hidden" : "";
            if (open) { drawer.querySelector("a").focus(); } else { opener.focus(); }
        };

        opener.addEventListener("click", function () { setDrawer(true); });
        Array.prototype.forEach.call(document.querySelectorAll("[data-drawer-close]"), function (el) {
            el.addEventListener("click", function () { setDrawer(false); });
        });
        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape" && drawer.classList.contains("is-open")) { setDrawer(false); }
        });
    }

    /* ---- Horizontal rails ---- */
    function step(rail) {
        var card = rail.firstElementChild;
        if (!card) { return rail.clientWidth; }
        var gap = parseFloat(getComputedStyle(rail).columnGap || getComputedStyle(rail).gap) || 0;
        var one = card.getBoundingClientRect().width + gap;
        var perView = Math.max(1, Math.floor(rail.clientWidth / one));
        return one * perView;
    }

    Array.prototype.forEach.call(document.querySelectorAll("[data-rail-prev],[data-rail-next]"), function (btn) {
        var isNext = btn.hasAttribute("data-rail-next");
        var rail = document.getElementById(btn.getAttribute(isNext ? "data-rail-next" : "data-rail-prev"));
        if (!rail) { return; }
        btn.addEventListener("click", function () {
            rail.scrollBy({ left: isNext ? step(rail) : -step(rail), behavior: "smooth" });
        });
    });

    /* ---- Offers carousel ---- */
    Array.prototype.forEach.call(document.querySelectorAll("[data-carousel]"), function (root) {
        var track = root.querySelector(".promo__track");
        var slides = root.querySelectorAll(".promo__slide");
        var dots = root.querySelectorAll(".promo__dots button");
        var play = root.querySelector(".promo__play");
        var delay = parseInt(root.getAttribute("data-carousel"), 10) || 5500;
        var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        var index = 0;
        var timer = null;

        if (slides.length < 2) { return; }

        function render() {
            track.style.transform = "translateX(" + (-index * 100) + "%)";
            Array.prototype.forEach.call(slides, function (slide, i) {
                slide.setAttribute("aria-hidden", String(i !== index));
                var link = slide.querySelector("a");
                if (link) { link.tabIndex = i === index ? 0 : -1; }
            });
            Array.prototype.forEach.call(dots, function (dot, i) {
                dot.setAttribute("aria-current", String(i === index));
            });
        }

        function go(next) {
            index = (next + slides.length) % slides.length;
            render();
        }

        function start() {
            if (reduced || timer) { return; }
            timer = window.setInterval(function () { go(index + 1); }, delay);
            if (play) { play.setAttribute("data-paused", "false"); }
        }

        function stop() {
            window.clearInterval(timer);
            timer = null;
            if (play) { play.setAttribute("data-paused", "true"); }
        }

        root.querySelector(".promo__arrow--prev").addEventListener("click", function () {
            go(index - 1); stop(); start();
        });
        root.querySelector(".promo__arrow--next").addEventListener("click", function () {
            go(index + 1); stop(); start();
        });
        Array.prototype.forEach.call(dots, function (dot, i) {
            dot.addEventListener("click", function () { go(i); stop(); start(); });
        });
        if (play) {
            play.addEventListener("click", function () {
                if (timer) { stop(); } else { start(); }
            });
        }

        /* Pause while hovered, focused or off-screen; resume otherwise. */
        root.addEventListener("mouseenter", stop);
        root.addEventListener("mouseleave", start);
        root.addEventListener("focusin", stop);
        root.addEventListener("focusout", start);
        document.addEventListener("visibilitychange", function () {
            if (document.hidden) { stop(); } else { start(); }
        });

        /* Keyboard */
        root.addEventListener("keydown", function (e) {
            if (e.key === "ArrowLeft") { go(index - 1); stop(); start(); }
            if (e.key === "ArrowRight") { go(index + 1); stop(); start(); }
        });

        /* Touch swipe */
        var startX = 0;
        var startY = 0;
        var swiping = false;
        root.addEventListener("touchstart", function (e) {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            swiping = true;
            stop();
        }, { passive: true });
        root.addEventListener("touchend", function (e) {
            if (!swiping) { return; }
            swiping = false;
            var dx = e.changedTouches[0].clientX - startX;
            var dy = e.changedTouches[0].clientY - startY;
            if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) { go(index + (dx < 0 ? 1 : -1)); }
            start();
        }, { passive: true });

        render();
        start();
    });

    /* ---- Lightbox (any [data-lightbox] container of <a href="image">) ---- */
    var groups = document.querySelectorAll("[data-lightbox]");
    if (!groups.length) { return; }

    var shots = [];
    Array.prototype.forEach.call(groups, function (group) {
        Array.prototype.forEach.call(group.querySelectorAll("a[href]"), function (link) {
            var index = shots.length;
            shots.push(link);
            link.addEventListener("click", function (e) {
                e.preventDefault();
                open(index);
            });
        });
    });
    if (!shots.length) { return; }

    var box = document.createElement("div");
    box.className = "lightbox";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-label", "Image viewer");
    box.innerHTML =
        '<button class="lightbox__close" type="button" aria-label="Close">' +
        '<svg class="ic"><use href="#i-close"/></svg></button>' +
        '<button class="lightbox__nav lightbox__nav--prev" type="button" aria-label="Previous image">' +
        '<svg class="ic"><use href="#i-arrow-l"/></svg></button>' +
        '<figure class="lightbox__stage"><img alt=""><figcaption></figcaption></figure>' +
        '<button class="lightbox__nav lightbox__nav--next" type="button" aria-label="Next image">' +
        '<svg class="ic"><use href="#i-arrow-r"/></svg></button>';
    document.body.appendChild(box);

    var frame = box.querySelector("img");
    var caption = box.querySelector("figcaption");
    var current = 0;
    var lastFocus = null;

    function show(index) {
        current = (index + shots.length) % shots.length;
        var link = shots[current];
        var thumb = link.querySelector("img");
        frame.src = link.getAttribute("href");
        frame.alt = thumb ? thumb.alt : "";
        caption.textContent = (current + 1) + " / " + shots.length;
    }

    function open(index) {
        lastFocus = document.activeElement;
        show(index);
        box.classList.add("is-open");
        document.body.style.overflow = "hidden";
        box.querySelector(".lightbox__close").focus();
    }

    function close() {
        box.classList.remove("is-open");
        document.body.style.overflow = "";
        frame.removeAttribute("src");
        if (lastFocus) { lastFocus.focus(); }
    }

    box.querySelector(".lightbox__close").addEventListener("click", close);
    box.querySelector(".lightbox__nav--prev").addEventListener("click", function () { show(current - 1); });
    box.querySelector(".lightbox__nav--next").addEventListener("click", function () { show(current + 1); });
    box.addEventListener("click", function (e) { if (e.target === box) { close(); } });

    document.addEventListener("keydown", function (e) {
        if (!box.classList.contains("is-open")) { return; }
        if (e.key === "Escape") { close(); }
        if (e.key === "ArrowLeft") { show(current - 1); }
        if (e.key === "ArrowRight") { show(current + 1); }
    });
}());
