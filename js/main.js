import { SITE_TITLE } from "./config.js";
import { renderIndex, renderNotice, renderArticle } from "./render.js";
import { initLive, fetchArticleList, fetchArticle, fetchArticleListGm, 
         fetchArticleGm, resolveSession, signIn, signOut, gmActive } from "./live.js";
import { openEditor } from "./editor.js";
import { initSearch } from "./search.js";


let articleList = [];
let linkTargets = new Map();


async function refreshData() {
    articleList = gmActive() ? await fetchArticleListGm() : await fetchArticleList();

    linkTargets = new Map();
    for (const article of articleList) {
        linkTargets.set(article.title.toLowerCase(), article.slug);
    }
}


async function route() {
    const content = document.querySelector("#content");
    const slug = window.location.hash.replace(/^#\/?/, "");

    window.scrollTo(0, 0);

    if (!slug) {
        renderIndex(articleList, content, gmActive());
        return;
    }

    if (slug === "_new" || slug.startsWith("_edit/")) {
        if (!gmActive()) {
            renderNotice(
                "There is no article here - at least, none that you can see.",
                content, false);
            return;
        }
        const editSlug = slug === "_new" ? "" : slug.slice("_edit/".length);
        try {
            await openEditor(editSlug, content, refreshData);
        } catch (err) {
            renderNotice(err.message, content, true);
        }
        return;
    }

    renderNotice("Loading...", content, false);
    try {
        const article = gmActive() ? await fetchArticleGm(slug)
                                   : await fetchArticle(slug);
        if (!article) {
            renderNotice(
                "There is no article here - at least, none that you can see.",
                content, false);
            return;
        }
        renderArticle(article, content, linkTargets, gmActive());
    } catch (err) {
        renderNotice(err.message, content, true);
    }
}


// Sync the header to the current session state
function updateHeader() {
    const toggle = document.querySelector("#gm-login-toggle");
    document.querySelector("#gm-login-form").classList.toggle("is-hidden", gmActive());
    document.querySelector("#gm-signed-in").classList.toggle("is-hidden", !gmActive());
    toggle.classList.toggle("header-btn--gm", gmActive());
}

// One-time even hookup for GM button
function wireHeader() {
    const panel = document.querySelector("#gm-login-panel");
    const form = document.querySelector("#gm-login-form");
    const errorBox = document.querySelector("#gm-login-error");

    document.querySelector("#gm-login-toggle").addEventListener("click", () => {
        panel.classList.toggle("is-hidden");
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        errorBox.classList.add("is-hidden");

        try {
            await signIn(
                document.querySelector("#gm-email").value,
                document.querySelector("#gm-password").value);
        } catch (err) {
            errorBox.textContent = err.message;
            errorBox.classList.remove("is-hidden");
            return;
        }

        if (!gmActive()) {
            await signOut();
            errorBox.textContent = "That account signed in, but is not a GM.";
            errorBox.classList.remove("is-hidden");
            return;
        }

        form.reset();
        panel.classList.add("is-hidden");
        updateHeader();
        await refreshData();
        route();
    });

    document.querySelector("#gm-signout").addEventListener("click", async () => {
        await signOut();
        panel.classList.add("is-hidden");
        updateHeader();
        await refreshData();
        route();
    });
}


async function boot() {
    document.title = SITE_TITLE;
    initLive();

    await resolveSession();
    wireHeader();
    updateHeader();

    try {
        await refreshData();
    } catch (err) {
        renderNotice(err.message, document.querySelector("#content"), true);
        return;
    }
    initSearch(() => articleList);

    window.addEventListener("hashchange", route);
    route();
}

boot();