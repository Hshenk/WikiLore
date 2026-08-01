import { SITE_TITLE } from "./config.js";
import { renderIndex, renderNotice, renderArticle } from "./render.js";
import { initLive, fetchArticleList, fetchArticle, resolveSession, 
         signIn, signOut, gmActive, isSignedIn, getDisplayName, 
         saveDisplayName, signUp } from "./live.js";
import { openEditor } from "./editor.js";
import { initSearch } from "./search.js";


let articleList = [];
let linkTargets = new Map();


async function refreshData() {
    articleList = await fetchArticleList();

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
        renderIndex(articleList, content, isSignedIn());
        return;
    }

    if (slug.includes("access_token") || slug.startsWith("error")) {
        window.location.hash = "#/";
        return;
    }

    if (slug === "_new" || slug.startsWith("_edit/")) {
        if (!isSignedIn()) {
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
        const article = await fetchArticle(slug);
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
    const needsName = isSignedIn() && !gmActive() && !getDisplayName();

    document.querySelector("#gm-login-form").classList.toggle("is-hidden", isSignedIn());
    document.querySelector("#name-form").classList.toggle("is-hidden", !needsName);
    document.querySelector("#gm-signed-in").classList.toggle("is-hidden",
        !isSignedIn() || needsName);

    toggle.classList.toggle("header-btn--gm", gmActive());
    if (gmActive()) {
        toggle.textContent = "GM";
    } else if (isSignedIn() && getDisplayName()) {
        toggle.textContent = getDisplayName();
    } else if (isSignedIn()) {
        toggle.textContent = "Finish setup";
    } else {
        toggle.textContent = "Sign in";
    }

    document.querySelector("#session-status").textContent = gmActive()
        ? "Signed in as GM - omniscient view."
        : "Signed in as " + (getDisplayName() || "...");
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
        errorBox.classList.remove("is-ok");

        try {
            await signIn(
                document.querySelector("#gm-email").value,
                document.querySelector("#gm-password").value);
        } catch (err) {
            errorBox.textContent = err.message;
            errorBox.classList.remove("is-hidden");
            return;
        }

        form.reset();
        updateHeader();
        if (gmActive() || getDisplayName()) {
            panel.classList.add("is-hidden");
        }
        await refreshData();
        route();
    });

    document.querySelector("#gm-signup").addEventListener("click", async () => {
        errorBox.classList.add("is-hidden");
        errorBox.classList.remove("is-ok");
        const email = document.querySelector("#gm-email").value.trim();
        const password = document.querySelector("#gm-password").value;

        if (!email || password.length < 6) {
            errorBox.textContent = "Enter an email and a password of at least 6 characters.";
            errorBox.classList.remove("is-hidden");
            return;
        }

        let result;
        try {
            result = await signUp(email, password);
        } catch (err) {
            errorBox.textContent = err.message;
            errorBox.classList.remove("is-hidden");
            return;
        }

        if (result.needsConfirm) {
            errorBox.textContent = 
                "Account created. Check your email for the confirmation link, then sign in.";
            errorBox.classList.add("is-ok");
            errorBox.classList.remove("is-hidden");
            return;
        }

        form.reset();
        updateHeader();
        await refreshData();
        route();
    });

    document.querySelector("#name-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const nameError = document.querySelector("#name-error");
        nameError.classList.add("is-hidden");

        try {
            await saveDisplayName(document.querySelector("#name-input").value.trim());
        } catch (err) {
            nameError.textContent = err.message;
            nameError.classList.remove("is-hidden");
            return;
        }

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
    if (new URLSearchParams(window.location.search).has("embed")) {
        document.body.classList.add("embed");
    }

    document.title = SITE_TITLE;
    initLive();

    await resolveSession();
    wireHeader();
    updateHeader();

    // If we need to set up a display name still, open the panel
    if (isSignedIn() && !gmActive() && !getDisplayName()) {
        document.querySelector("#gm-login-panel").classList.remove("is-hidden");
    }

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