import { SITE_TITLE } from "./config.js";
import { renderIndex, renderNotice, renderArticle } from "./render.js";
import { initLive, fetchArticleList, fetchArticle } from "./live.js";


let articleList = [];
let linkTargets = new Map();



async function route() {
    const content = document.querySelector("#content");
    const slug = window.location.hash.replace(/^#\/?/, "");

    window.scrollTo(0, 0);

    if (!slug) {
        renderIndex(articleList, content);
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
        renderArticle(article, content, linkTargets);
    } catch (err) {
        renderNotice(err.message, content, true);
    }
}


async function boot() {
    document.title = SITE_TITLE;
    initLive();

    try {
        articleList = await fetchArticleList();
    } catch (err) {
        renderNotice(err.message, document.querySelector("#content"), true);
        return;
    }

    for (const article of articleList) {
        linkTargets.set(article.title.toLowerCase(), article.slug);
    }

    window.addEventListener("hashchange", route);
    route();
}

boot();